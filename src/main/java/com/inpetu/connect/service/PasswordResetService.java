package com.inpetu.connect.service;

import com.inpetu.connect.model.CodigoRecuperacaoSenha;
import com.inpetu.connect.model.EventoCadastro;
import com.inpetu.connect.model.LogAuditoria;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.CodigoRecuperacaoSenhaRepository;
import com.inpetu.connect.repository.EventoCadastroRepository;
import com.inpetu.connect.repository.LogAuditoriaRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import com.inpetu.connect.security.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class PasswordResetService {
    private static final Logger logger = LoggerFactory.getLogger(PasswordResetService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String GENERIC_MESSAGE =
        "Se o e-mail estiver associado a uma conta ativa, enviaremos um código de recuperação.";
    private static final int VALIDITY_MINUTES = 10;
    private static final int MAX_CODE_ATTEMPTS = 5;
    private static final int MAX_SENDS_PER_EMAIL = 3;
    private static final int MAX_SENDS_PER_IP = 10;
    private static final int MAX_VALIDATIONS_PER_EMAIL = 30;
    private static final int MAX_VALIDATIONS_PER_IP = 60;

    private final UsuarioRepository usuarios;
    private final CodigoRecuperacaoSenhaRepository codigos;
    private final EventoCadastroRepository eventos;
    private final LogAuditoriaRepository auditoria;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final boolean trustProxyHeaders;
    private final Set<String> trustedProxies;
    private final String otpSecret;
    private final String rateLimitSecret;
    private final boolean mailEnabled;
    private final boolean logDevCodes;

    @org.springframework.beans.factory.annotation.Autowired
    public PasswordResetService(
        UsuarioRepository usuarios,
        CodigoRecuperacaoSenhaRepository codigos,
        EventoCadastroRepository eventos,
        LogAuditoriaRepository auditoria,
        org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
        EmailSender emailSender,
        @Value("${app.trust-proxy-headers:false}") boolean trustProxyHeaders,
        @Value("${app.security.trusted-proxies:}") String trustedProxyConfig,
        @Value("${OTP_SECRET:}") String otpSecret,
        @Value("${APP_RATE_LIMIT_SECRET:}") String rateLimitSecret,
        @Value("${app.mail.enabled:false}") boolean mailEnabled,
        @Value("${APP_PASSWORD_RESET_DEV_CODE_LOG:false}") boolean devCodeLogEnabled,
        Environment environment
    ) {
        requireSecret(otpSecret, "OTP_SECRET");
        boolean localWithoutMail = !mailEnabled && environment.acceptsProfiles(Profiles.of("dev"));
        String effectiveRateLimitSecret = rateLimitSecret == null || rateLimitSecret.isBlank()
            ? localWithoutMail ? otpSecret : rateLimitSecret
            : rateLimitSecret;
        requireSecret(effectiveRateLimitSecret, "APP_RATE_LIMIT_SECRET");
        this.usuarios = usuarios;
        this.codigos = codigos;
        this.eventos = eventos;
        this.auditoria = auditoria;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.trustProxyHeaders = trustProxyHeaders;
        this.trustedProxies = ClientIpResolver.parseTrustedProxies(trustedProxyConfig);
        this.otpSecret = otpSecret;
        this.rateLimitSecret = effectiveRateLimitSecret;
        this.mailEnabled = mailEnabled;
        this.logDevCodes = !mailEnabled && devCodeLogEnabled
            && environment.acceptsProfiles(Profiles.of("dev"));
    }

    public PasswordResetService(
        UsuarioRepository usuarios,
        CodigoRecuperacaoSenhaRepository codigos,
        EventoCadastroRepository eventos,
        LogAuditoriaRepository auditoria,
        org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
        EmailSender emailSender,
        String trustedProxyConfig,
        String otpSecret,
        String rateLimitSecret,
        boolean mailEnabled,
        boolean devCodeLogEnabled,
        Environment environment
    ) {
        this(usuarios, codigos, eventos, auditoria, passwordEncoder, emailSender,
             false, trustedProxyConfig, otpSecret, rateLimitSecret, mailEnabled, devCodeLogEnabled, environment);
    }

    public ResponseEntity<Map<String, String>> solicitar(String email, HttpServletRequest request) {
        String normalizedEmail = normalize(email);
        String clientIp = ClientIpResolver.resolve(request, trustProxyHeaders, trustedProxies);
        String emailHash = keyedHash(rateLimitSecret, normalizedEmail);
        String ipHash = clientIp == null || clientIp.isBlank() ? null : keyedHash(rateLimitSecret, clientIp);
        LocalDateTime now = LocalDateTime.now();
        boolean limited = eventos.countByTipoAndEmailHashAndCriadoEmAfter(
                EventoCadastro.TipoEvento.RESET_ENVIO, emailHash, now.minusHours(1)) >= MAX_SENDS_PER_EMAIL
            || ipHash != null && eventos.countByTipoAndIpHashAndCriadoEmAfter(
                EventoCadastro.TipoEvento.RESET_ENVIO, ipHash, now.minusHours(1)) >= MAX_SENDS_PER_IP;
        if (limited) return rateLimited();
        recordEvent(EventoCadastro.TipoEvento.RESET_ENVIO, emailHash, ipHash);

        usuarios.findByEmailIgnoreCase(normalizedEmail)
            .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
            .ifPresent(usuario -> createAndDeliverCode(usuario, normalizedEmail));
        return ResponseEntity.accepted().body(Map.of("mensagem", GENERIC_MESSAGE));
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> validar(String email, String code, HttpServletRequest request) {
        String normalizedEmail = normalize(email);
        String clientIp = ClientIpResolver.resolve(request, trustProxyHeaders, trustedProxies);
        String emailHash = keyedHash(rateLimitSecret, normalizedEmail);
        String ipHash = clientIp == null || clientIp.isBlank() ? null : keyedHash(rateLimitSecret, clientIp);
        if (isValidationRateLimited(emailHash, ipHash)) return rateLimited();
        recordEvent(EventoCadastro.TipoEvento.RESET_TENTATIVA, emailHash, ipHash);
        Usuario usuario = findActiveUser(normalizedEmail);
        verifyCode(usuario, code);
        return ResponseEntity.ok(Map.of("mensagem", "Código validado."));
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> redefinir(
        String email,
        String code,
        String newPassword,
        HttpServletRequest request
    ) {
        String normalizedEmail = normalize(email);
        String clientIp = ClientIpResolver.resolve(request, trustProxyHeaders, trustedProxies);
        String emailHash = keyedHash(rateLimitSecret, normalizedEmail);
        String ipHash = clientIp == null || clientIp.isBlank() ? null : keyedHash(rateLimitSecret, clientIp);
        if (isValidationRateLimited(emailHash, ipHash)) return rateLimited();
        recordEvent(EventoCadastro.TipoEvento.RESET_TENTATIVA, emailHash, ipHash);
        Usuario usuario = findActiveUser(normalizedEmail);
        CodigoRecuperacaoSenha codigo = verifyCode(usuario, code);
        if (newPassword == null || newPassword.length() < 8 || newPassword.length() > 64) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A nova senha deve ter entre 8 e 64 caracteres.");
        }

        usuario.setSenhaHash(passwordEncoder.encode(newPassword));
        usuario.setSenhaTemporaria(false);
        usuario.setVersaoToken((usuario.getVersaoToken() == null ? 0 : usuario.getVersaoToken()) + 1);
        usuarios.save(usuario);
        codigos.delete(codigo);

        LogAuditoria log = new LogAuditoria();
        log.setTabelaAfetada("usuario");
        log.setIdRegistroAfetado(usuario.getIdUsuario());
        log.setAcao("REDEFINICAO_SENHA");
        log.setDetalhesAlteracao("Senha redefinida pelo fluxo de recuperação.");
        log.setIdUsuarioResponsavel(usuario.getIdUsuario());
        auditoria.save(log);
        recordEvent(EventoCadastro.TipoEvento.RESET_SUCESSO, emailHash, ipHash);
        return ResponseEntity.ok(Map.of("mensagem", "Senha redefinida. Entre com sua nova senha."));
    }

    private void createAndDeliverCode(Usuario usuario, String email) {
        String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        CodigoRecuperacaoSenha entry = new CodigoRecuperacaoSenha();
        entry.setIdUsuario(usuario.getIdUsuario());
        entry.setCodigoHmac(keyedHash(otpSecret, code));
        entry.setExpiraEm(LocalDateTime.now().plusMinutes(VALIDITY_MINUTES));
        entry.setTentativas(0);
        codigos.save(entry);

        try {
            if (mailEnabled) {
                emailSender.sendPasswordResetCode(email, usuario.getNomeCompleto(), code, VALIDITY_MINUTES);
            } else if (logDevCodes) {
                logger.info("Código local de recuperação para {}: {}", maskedEmail(email), code);
            } else {
                logger.warn("Recuperação de senha aceita, mas o envio está desativado para {}.", maskedEmail(email));
            }
        } catch (RuntimeException error) {
            logger.warn("A solicitação de recuperação foi aceita, mas o envio de e-mail falhou para {} ({}).",
                maskedEmail(email), error.getClass().getSimpleName());
        }
    }

    private CodigoRecuperacaoSenha verifyCode(Usuario usuario, String code) {
        if (usuario == null) throw invalidOrExpired();
        CodigoRecuperacaoSenha entry = codigos.findLockedByIdUsuario(usuario.getIdUsuario()).orElse(null);
        LocalDateTime now = LocalDateTime.now();
        if (entry == null) throw invalidOrExpired();
        if (entry.getExpiraEm() == null || !entry.getExpiraEm().isAfter(now)) {
            codigos.delete(entry);
            throw invalidOrExpired();
        }
        int attempts = entry.getTentativas() == null ? 0 : entry.getTentativas();
        if (attempts >= MAX_CODE_ATTEMPTS) {
            codigos.delete(entry);
            throw attemptsExhausted();
        }
        if (!MessageDigest.isEqual(
            entry.getCodigoHmac().getBytes(StandardCharsets.US_ASCII),
            keyedHash(otpSecret, code).getBytes(StandardCharsets.US_ASCII))) {
            entry.setTentativas(attempts + 1);
            if (attempts + 1 >= MAX_CODE_ATTEMPTS) {
                codigos.delete(entry);
                throw attemptsExhausted();
            }
            codigos.save(entry);
            throw invalidOrExpired();
        }
        return entry;
    }

    private Usuario findActiveUser(String email) {
        return usuarios.findByEmailIgnoreCase(email)
            .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
            .orElse(null);
    }

    private boolean isValidationRateLimited(String emailHash, String ipHash) {
        LocalDateTime after = LocalDateTime.now().minusHours(1);
        return eventos.countByTipoAndEmailHashAndCriadoEmAfter(
                EventoCadastro.TipoEvento.RESET_TENTATIVA, emailHash, after) >= MAX_VALIDATIONS_PER_EMAIL
            || ipHash != null && eventos.countByTipoAndIpHashAndCriadoEmAfter(
                EventoCadastro.TipoEvento.RESET_TENTATIVA, ipHash, after) >= MAX_VALIDATIONS_PER_IP;
    }

    private void recordEvent(EventoCadastro.TipoEvento type, String emailHash, String ipHash) {
        EventoCadastro event = new EventoCadastro();
        event.setTipo(type);
        event.setEmailHash(emailHash);
        event.setIpHash(ipHash);
        eventos.save(event);
    }

    private ResponseEntity<Map<String, String>> rateLimited() {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header(HttpHeaders.RETRY_AFTER, "3600")
            .body(Map.of("mensagem", "Muitas tentativas. Tente novamente em alguns minutos."));
    }

    private ResponseStatusException invalidOrExpired() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "Código inválido ou expirado. Peça um novo código.");
    }

    private ResponseStatusException attemptsExhausted() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "Número máximo de tentativas atingido. Peça um novo código.");
    }

    private String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String keyedHash(String secret, String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) {
            throw new IllegalStateException("Não foi possível proteger os dados da recuperação de senha.", error);
        }
    }

    private void requireSecret(String secret, String name) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException(name + " deve conter pelo menos 32 caracteres.");
        }
    }

    private String maskedEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 0) return "***";
        return email.charAt(0) + "***" + email.substring(at);
    }
}
