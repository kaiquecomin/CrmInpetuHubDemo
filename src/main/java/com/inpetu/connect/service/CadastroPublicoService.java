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

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class CadastroPublicoService {
    private static final Logger logger = LoggerFactory.getLogger(CadastroPublicoService.class);
    public static final String SUCCESS_MESSAGE = "Enviamos um link de confirmação para o e-mail informado, se ele for válido.";
    private static final int MAX_CADASTROS_POR_IP = 5;
    private static final int MAX_REENVIO_POR_PENDENTE = 5;
    private static final int MAX_EMAILS_POR_DIA = 3;
    private static final long REENVIO_INTERVALO_SEGUNDOS = 60L;

    private final UsuarioRepository usuarios;
    private final OrganizacaoRepository organizacoes;
    private final CadastroPendenteRepository pendentes;
    private final EventoCadastroRepository eventos;
    private final PasswordEncoder passwordEncoder;
    private final EmailDomainValidator emailDomainValidator;
    private final EmailSender emailSender;
    private final Set<String> trustedProxies;
    private final String rateLimitSecret;

    public CadastroPublicoService(UsuarioRepository usuarios,
                                 OrganizacaoRepository organizacoes,
                                 CadastroPendenteRepository pendentes,
                                 EventoCadastroRepository eventos,
                                 PasswordEncoder passwordEncoder,
                                 EmailDomainValidator emailDomainValidator,
                                 EmailSender emailSender,
                                 @Value("${app.security.trusted-proxies:}") String trustedProxyConfig,
                                 @Value("${APP_RATE_LIMIT_SECRET:inpetu-dev-rate-limit-secret}") String rateLimitSecret) {
        this.usuarios = usuarios;
        this.organizacoes = organizacoes;
        this.pendentes = pendentes;
        this.eventos = eventos;
        this.passwordEncoder = passwordEncoder;
        this.emailDomainValidator = emailDomainValidator;
        this.emailSender = emailSender;
        this.trustedProxies = ClientIpResolver.parseTrustedProxies(trustedProxyConfig);
        this.rateLimitSecret = rateLimitSecret;
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
        if (existing.isPresent()) {
            pendente.setNomeCompleto(request.nomeCompleto().trim());
            pendente.setTelefone(request.telefone());
            pendente.setCargoVinculo(request.cargoVinculo().trim());
            pendente.setNomeOrganizacao(request.organizacao().trim());
            pendente.setSenhaHash(passwordEncoder.encode(request.senha()));
            pendente.setTokenHash(hashToken(newToken()));
            pendente.setExpiraEm(LocalDateTime.now().plusMinutes(20));
            pendente.setUltimoEnvioEm(LocalDateTime.now());
            pendente.setTotalEnvios(pendente.getTotalEnvios() == null ? 1 : pendente.getTotalEnvios() + 1);
        } else {
            pendente.setNomeCompleto(request.nomeCompleto().trim());
            pendente.setEmail(email);
            pendente.setTelefone(request.telefone());
            pendente.setCargoVinculo(request.cargoVinculo().trim());
            pendente.setNomeOrganizacao(request.organizacao().trim());
            pendente.setSenhaHash(passwordEncoder.encode(request.senha()));
            pendente.setTokenHash(hashToken(newToken()));
            pendente.setExpiraEm(LocalDateTime.now().plusMinutes(20));
            pendente.setCriadoEm(LocalDateTime.now());
            pendente.setUltimoEnvioEm(LocalDateTime.now());
            pendente.setTotalEnvios(1);
        }

        pendentes.save(pendente);
        recordEvent(EventoCadastro.TipoEvento.CADASTRO, ip, email);
        scheduleEmail(pendente);
        return pendingAccepted();
    }

    @Transactional
    public ResponseEntity<Map<String, String>> confirmarToken(String rawToken) {
        String tokenHash = hashToken(rawToken);
        CadastroPendente pendente = pendentes.findByTokenHash(tokenHash)
            .orElse(null);
        if (pendente == null || pendente.getExpiraEm().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", "Link inválido ou expirado"));
        }

        if (usuarios.findByEmailIgnoreCase(pendente.getEmail()).isPresent()) {
            pendentes.delete(pendente);
            return ResponseEntity.badRequest().body(Map.of("mensagem", "Link inválido ou expirado"));
        }

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
        usuarios.save(usuario);

        pendentes.delete(pendente);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("mensagem", "Conta confirmada. Entre com seu e-mail e senha."));
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
        pendente.setTokenHash(hashToken(newToken()));
        pendente.setExpiraEm(agora.plusMinutes(20));
        pendente.setUltimoEnvioEm(agora);
        pendente.setTotalEnvios(pendente.getTotalEnvios() == null ? 1 : pendente.getTotalEnvios() + 1);
        pendentes.save(pendente);

        recordEvent(EventoCadastro.TipoEvento.ENVIO, null, normalized);
        scheduleEmail(pendente);
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
    public void scheduleEmail(CadastroPendente pendente) {
        try {
            emailSender.sendConfirmation(pendente);
        } catch (RuntimeException e) {
            logger.warn("Cadastro pendente salvo, mas envio de confirmação falhou para {}.", pendente.getEmail(), e);
        }
    }

    private ResponseEntity<Map<String, String>> pendingAccepted() {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("mensagem", SUCCESS_MESSAGE));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String newToken() {
        byte[] tokenBytes = new byte[32];
        new SecureRandom().nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    private String hashToken(String rawToken) {
        return hashValue(rawToken);
    }

    private String hashValue(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest((rateLimitSecret + value).getBytes());
            return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao gerar hash do valor.", e);
        }
    }
}
