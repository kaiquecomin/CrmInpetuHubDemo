package com.inpetu.connect.service;

import com.inpetu.connect.dto.CadastroPublicoRequest;
import com.inpetu.connect.model.CadastroPendente;
import com.inpetu.connect.model.EventoCadastro;
import com.inpetu.connect.model.Organizacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.CadastroPendenteRepository;
import com.inpetu.connect.repository.EventoCadastroRepository;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import com.inpetu.connect.security.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class CadastroPublicoService {
    private static final Logger logger = LoggerFactory.getLogger(CadastroPublicoService.class);
    public static final String SUCCESS_MESSAGE = "Enviamos um e-mail com as instruções de acesso.";
    private static final int MAX_CADASTROS_POR_IP = 5;
    private static final int MAX_REENVIO_POR_PENDENTE = 5;
    private static final int MAX_CODIGOS_POR_HORA = 3;
    private static final int MAX_EMAILS_POR_DIA = 3;
    private static final long REENVIO_INTERVALO_SEGUNDOS = 60L;
    public static final int CODIGO_VALIDADE_MINUTOS = 10;
    private static final int MAX_TENTATIVAS_CODIGO = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UsuarioRepository usuarios;
    private final OrganizacaoRepository organizacoes;
    private final CadastroPendenteRepository pendentes;
    private final EventoCadastroRepository eventos;
    private final PasswordEncoder passwordEncoder;
    private final EmailDomainValidator emailDomainValidator;
    private final EmailSender emailSender;
    private final Set<String> trustedProxies;
    private final String rateLimitSecret;
    private final String otpSecret;

    public CadastroPublicoService(UsuarioRepository usuarios,
                                 OrganizacaoRepository organizacoes,
                                 CadastroPendenteRepository pendentes,
                                 EventoCadastroRepository eventos,
                                 PasswordEncoder passwordEncoder,
                                 EmailDomainValidator emailDomainValidator,
                                 EmailSender emailSender,
                                 @Value("${app.security.trusted-proxies:}") String trustedProxyConfig,
                                 @Value("${APP_RATE_LIMIT_SECRET:}") String rateLimitSecret,
                                 @Value("${OTP_SECRET:}") String otpSecret) {
        if (otpSecret == null || otpSecret.length() < 32) {
            throw new IllegalStateException("OTP_SECRET deve conter pelo menos 32 caracteres.");
        }
        this.usuarios = usuarios;
        this.organizacoes = organizacoes;
        this.pendentes = pendentes;
        this.eventos = eventos;
        this.passwordEncoder = passwordEncoder;
        this.emailDomainValidator = emailDomainValidator;
        this.emailSender = emailSender;
        this.trustedProxies = ClientIpResolver.parseTrustedProxies(trustedProxyConfig);
        this.rateLimitSecret = rateLimitSecret;
        this.otpSecret = otpSecret;
    }

    public ResponseEntity<Map<String,String>> cadastrar(CadastroPublicoRequest request, HttpServletRequest servletRequest) {
        String email = normalizeEmail(request.email());
        String ip = ClientIpResolver.resolve(servletRequest, trustedProxies);

        try {
            emailDomainValidator.validate(email);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Não foi possível usar este e-mail. Verifique o endereço.", e);
        }

        if (isRateLimitedByIp(ip)) {
            return pendingAccepted();
        }

        if (usuarios.findByEmailIgnoreCase(email).filter(Usuario::getAtivo).isPresent()) {
            recordEvent(EventoCadastro.TipoEvento.CADASTRO, ip, email);
            return pendingAccepted();
        }

        Optional<CadastroPendente> existing = pendentes.findByEmailIgnoreCase(email);
        CadastroPendente pendente = existing.orElseGet(CadastroPendente::new);
        String rawToken = newToken();
        String code = newCode();
        LocalDateTime now = LocalDateTime.now();
        if (existing.isPresent()) {
            pendente.setNomeCompleto(request.nomeCompleto().trim());
            pendente.setTelefone(request.telefone());
            pendente.setCargoVinculo(request.cargoVinculo().trim());
            pendente.setNomeOrganizacao(request.organizacao().trim());
            pendente.setSenhaHash(passwordEncoder.encode(request.senha()));
            pendente.setTokenHash(hashToken(rawToken));
            pendente.setExpiraEm(now.plusMinutes(20));
            pendente.setCodigoHash(hashCode(code));
            pendente.setCodigoExpiraEm(now.plusMinutes(CODIGO_VALIDADE_MINUTOS));
            pendente.setTentativas(0);
            pendente.setUltimoEnvioEm(now);
            pendente.setTotalEnvios(pendente.getTotalEnvios() == null ? 1 : pendente.getTotalEnvios() + 1);
        } else {
            pendente.setNomeCompleto(request.nomeCompleto().trim());
            pendente.setEmail(email);
            pendente.setTelefone(request.telefone());
            pendente.setCargoVinculo(request.cargoVinculo().trim());
            pendente.setNomeOrganizacao(request.organizacao().trim());
            pendente.setSenhaHash(passwordEncoder.encode(request.senha()));
            pendente.setTokenHash(hashToken(rawToken));
            pendente.setExpiraEm(now.plusMinutes(20));
            pendente.setCodigoHash(hashCode(code));
            pendente.setCodigoExpiraEm(now.plusMinutes(CODIGO_VALIDADE_MINUTOS));
            pendente.setTentativas(0);
            pendente.setCriadoEm(now);
            pendente.setUltimoEnvioEm(now);
            pendente.setTotalEnvios(1);
        }

        pendentes.save(pendente);
        recordEvent(EventoCadastro.TipoEvento.CADASTRO, ip, email);
        sendCodeEmail(pendente, code);
        return pendingAccepted();
    }

    @Transactional
    public ResponseEntity<Map<String, String>> confirmarToken(String rawToken) {
        String tokenHash = hashToken(rawToken);
        CadastroPendente pendente = pendentes.findByTokenHash(tokenHash)
            .orElse(null);
        if (pendente == null || !constantTimeEquals(pendente.getTokenHash(), tokenHash)
            || pendente.getExpiraEm().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", "Link inválido ou expirado"));
        }

        if (usuarios.findByEmailIgnoreCase(pendente.getEmail()).isPresent()) {
            pendentes.delete(pendente);
            return ResponseEntity.badRequest().body(Map.of("mensagem", "Link inválido ou expirado"));
        }

        efetivarCadastro(pendente);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("mensagem", "Conta confirmada. Entre com seu e-mail e senha."));
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public Usuario confirmarCodigo(String email, String code) {
        String normalized = normalizeEmail(email);
        CadastroPendente pendente = pendentes.findByEmailIgnoreCase(normalized).orElse(null);
        if (pendente == null || !codigoValido(pendente, code)) {
            if (pendente != null) {
                int tentativas = pendente.getTentativas() == null ? 0 : pendente.getTentativas();
                if (tentativas >= MAX_TENTATIVAS_CODIGO) {
                    pendente.setCodigoHash(null);
                    pendente.setCodigoExpiraEm(null);
                }
                pendentes.save(pendente);
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Código inválido ou expirado. Solicite um novo código.");
        }
        return efetivarCadastro(pendente);
    }

    public ResponseEntity<Map<String, String>> reenviarCodigo(String email, HttpServletRequest servletRequest) {
        String normalized = normalizeEmail(email);
        String ip = ClientIpResolver.resolve(servletRequest, trustedProxies);
        if (isOtpResendRateLimited(ip, normalized)) {
            recordEvent(EventoCadastro.TipoEvento.ENVIO, ip, normalized);
            return pendingAccepted();
        }

        CadastroPendente pendente = pendentes.findByEmailIgnoreCase(normalized).orElse(null);
        if (pendente == null) {
            recordEvent(EventoCadastro.TipoEvento.ENVIO, ip, normalized);
            return pendingAccepted();
        }
        LocalDateTime now = LocalDateTime.now();
        if (pendente.getUltimoEnvioEm() != null
            && pendente.getUltimoEnvioEm().plusSeconds(REENVIO_INTERVALO_SEGUNDOS).isAfter(now)) {
            return pendingAccepted();
        }
        int totalEnvios = pendente.getTotalEnvios() == null ? 0 : pendente.getTotalEnvios();
        if (totalEnvios >= MAX_REENVIO_POR_PENDENTE) {
            return pendingAccepted();
        }

        String code = newCode();
        pendente.setCodigoHash(hashCode(code));
        pendente.setCodigoExpiraEm(now.plusMinutes(CODIGO_VALIDADE_MINUTOS));
        pendente.setTentativas(0);
        pendente.setUltimoEnvioEm(now);
        pendente.setTotalEnvios(totalEnvios + 1);
        pendentes.save(pendente);
        recordEvent(EventoCadastro.TipoEvento.ENVIO, ip, normalized);
        sendCodeEmail(pendente, code);
        return pendingAccepted();
    }

    public ResponseEntity<Map<String, String>> reenviarConfirmacao(String email) {
        String normalized = normalizeEmail(email);
        CadastroPendente pendente = pendentes.findByEmailIgnoreCase(normalized).orElse(null);
        if (pendente == null) {
            return pendingAccepted();
        }
        LocalDateTime agora = LocalDateTime.now();
        if (pendente.getUltimoEnvioEm() != null && pendente.getUltimoEnvioEm().plusSeconds(REENVIO_INTERVALO_SEGUNDOS).isAfter(agora)) {
            return pendingAccepted();
        }
        if (pendente.getTotalEnvios() != null && pendente.getTotalEnvios() >= MAX_REENVIO_POR_PENDENTE) {
            return pendingAccepted();
        }
        if (isRateLimitedByEmail(normalized)) {
            return pendingAccepted();
        }
        String rawToken = newToken();
        pendente.setTokenHash(hashToken(rawToken));
        pendente.setExpiraEm(agora.plusMinutes(20));
        pendente.setUltimoEnvioEm(agora);
        pendente.setTotalEnvios(pendente.getTotalEnvios() == null ? 1 : pendente.getTotalEnvios() + 1);
        pendentes.save(pendente);

        recordEvent(EventoCadastro.TipoEvento.ENVIO, null, normalized);
        scheduleEmail(pendente, rawToken);
        return pendingAccepted();
    }

    private boolean isRateLimitedByIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }
        String ipHash = hashValue(ip);
        long count = eventos.countByIpHashAndCriadoEmAfter(ipHash, LocalDateTime.now().minusHours(1));
        return count >= MAX_CADASTROS_POR_IP;
    }

    private boolean isRateLimitedByEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        String emailHash = hashValue(email);
        long count = eventos.countByEmailHashAndCriadoEmAfter(emailHash, LocalDateTime.now().minusDays(1));
        return count >= MAX_EMAILS_POR_DIA;
    }

    private boolean isOtpResendRateLimited(String ip, String email) {
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        if (email != null && !email.isBlank()
            && eventos.countByEmailHashAndCriadoEmAfter(hashValue(email), oneHourAgo) >= MAX_CODIGOS_POR_HORA) {
            return true;
        }
        return ip != null && !ip.isBlank()
            && eventos.countByIpHashAndCriadoEmAfter(hashValue(ip), oneHourAgo) >= MAX_CODIGOS_POR_HORA;
    }

    private void recordEvent(EventoCadastro.TipoEvento tipo, String ip, String email) {
        EventoCadastro evento = new EventoCadastro();
        evento.setTipo(tipo);
        if (ip != null && !ip.isBlank()) {
            evento.setIpHash(hashValue(ip));
        }
        if (email != null && !email.isBlank()) {
            evento.setEmailHash(hashValue(email));
        }
        eventos.save(evento);
    }

    @Async
    public void scheduleEmail(CadastroPendente pendente, String rawToken) {
        try {
            emailSender.sendConfirmation(pendente, rawToken);
        } catch (RuntimeException e) {
            logger.warn("Cadastro pendente salvo, mas envio de confirmação falhou para {} ({}).",
                maskedEmail(pendente.getEmail()), e.getClass().getSimpleName());
        }
    }

    private void sendCodeEmail(CadastroPendente pendente, String code) {
        try {
            emailSender.sendConfirmationCode(pendente, code, CODIGO_VALIDADE_MINUTOS);
        } catch (RuntimeException e) {
            logger.warn("Cadastro pendente salvo, mas o envio do código falhou para {} ({}).",
                maskedEmail(pendente.getEmail()), e.getClass().getSimpleName());
            pendente.setUltimoEnvioEm(LocalDateTime.now().minusSeconds(REENVIO_INTERVALO_SEGUNDOS));
            pendentes.save(pendente);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "O cadastro foi salvo, mas não foi possível enviar o código. Tente reenviar em instantes.");
        }
    }

    private boolean codigoValido(CadastroPendente pendente, String code) {
        LocalDateTime now = LocalDateTime.now();
        if (pendente.getCodigoHash() == null || pendente.getCodigoExpiraEm() == null) {
            return false;
        }
        if (!pendente.getCodigoExpiraEm().isAfter(now)) {
            pendente.setCodigoHash(null);
            pendente.setCodigoExpiraEm(null);
            return false;
        }
        int tentativas = pendente.getTentativas() == null ? 0 : pendente.getTentativas();
        if (tentativas >= MAX_TENTATIVAS_CODIGO) {
            pendente.setCodigoHash(null);
            pendente.setCodigoExpiraEm(null);
            return false;
        }
        boolean matches = constantTimeEquals(pendente.getCodigoHash(), hashCode(code));
        if (matches) return true;
        tentativas++;
        pendente.setTentativas(tentativas);
        if (tentativas >= MAX_TENTATIVAS_CODIGO) {
            pendente.setCodigoHash(null);
            pendente.setCodigoExpiraEm(null);
        }
        return false;
    }

    private Usuario efetivarCadastro(CadastroPendente pendente) {
        Organizacao organizacao = new Organizacao();
        organizacao.setNomeOrganizacao(pendente.getNomeOrganizacao());
        organizacao.setTipoOrganizacao("Pendente de classificação");
        organizacao = organizacoes.save(organizacao);

        Usuario usuario = new Usuario();
        usuario.setNomeCompleto(pendente.getNomeCompleto());
        usuario.setEmail(pendente.getEmail());
        usuario.setTelefone(pendente.getTelefone());
        usuario.setCargoVinculo(pendente.getCargoVinculo());
        usuario.setSenhaHash(pendente.getSenhaHash());
        usuario.setIdPerfil(4);
        usuario.setIdPersona(null);
        usuario.setIdOrganizacao(organizacao.getIdOrganizacao());
        usuario.setAtivo(true);
        Usuario criado = usuarios.save(usuario);
        pendentes.delete(pendente);
        return criado;
    }

    private ResponseEntity<Map<String, String>> pendingAccepted() {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("mensagem", SUCCESS_MESSAGE));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String newToken() {
        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    private String newCode() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    private String hashCode(String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(otpSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(code.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao proteger o código de confirmação.", e);
        }
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao gerar hash do token.", e);
        }
    }

    private boolean constantTimeEquals(String storedHash, String calculatedHash) {
        if (storedHash == null || calculatedHash == null) {
            return false;
        }
        return MessageDigest.isEqual(
            storedHash.getBytes(StandardCharsets.US_ASCII),
            calculatedHash.getBytes(StandardCharsets.US_ASCII));
    }

    private String maskedEmail(String email) {
        int separator = email == null ? -1 : email.indexOf('@');
        if (separator <= 0 || separator != email.lastIndexOf('@')
            || !email.matches("^[^\\s@]+@[^\\s@.]+(?:\\.[^\\s@.]+)*\\.[A-Za-z0-9-]{2,}$")) {
            return "***";
        }
        int topLevelDomainSeparator = email.lastIndexOf('.');
        if (topLevelDomainSeparator <= separator || topLevelDomainSeparator == email.length() - 1) {
            return "***";
        }
        String topLevelDomain = email.substring(topLevelDomainSeparator + 1);
        if (topLevelDomain.chars().anyMatch(Character::isWhitespace)) {
            return "***";
        }
        return email.charAt(0) + "***@***." + topLevelDomain;
    }

    private String hashValue(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest((rateLimitSecret + value).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao gerar hash do valor.", e);
        }
    }
}
