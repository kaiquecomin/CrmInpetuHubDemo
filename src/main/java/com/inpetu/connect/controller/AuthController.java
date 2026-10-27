package com.inpetu.connect.controller;

import com.inpetu.connect.dto.*;
import com.inpetu.connect.model.*;
import com.inpetu.connect.repository.*;
import com.inpetu.connect.security.JwtService;
import com.inpetu.connect.security.ClientIpResolver;
import com.inpetu.connect.security.LoginAttemptService;
import com.inpetu.connect.service.CadastroPublicoService;
import com.inpetu.connect.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.Set;
import java.util.Map;
import java.util.LinkedHashMap;

@RestController @RequestMapping("/api/v1")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private static final String PUBLIC_SIGNUP_MESSAGE = "Enviamos um e-mail com as instruções de acesso.";

    private final AuthenticationManager auth;
    private final JwtService jwt;
    private final UserDetailsService users;
    private final UsuarioRepository usuarios;
    private final UsuarioFotoRepository fotos;
    private final OrganizacaoRepository organizacoes;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttempts;
    private final boolean trustProxyHeaders;
    private final Set<String> trustedProxies;
    private final CadastroPublicoService cadastroPublicoService;
    private final PasswordResetService passwordResetService;
    private final boolean cookieSecure;

    @org.springframework.beans.factory.annotation.Autowired
    public AuthController(AuthenticationManager auth, JwtService jwt, UserDetailsService users,
                          UsuarioRepository usuarios, UsuarioFotoRepository fotos, OrganizacaoRepository organizacoes, PasswordEncoder passwordEncoder,
                          LoginAttemptService loginAttempts,
                          @Value("${app.trust-proxy-headers:false}") boolean trustProxyHeaders,
                          @Value("${app.security.trusted-proxies:}") String trustedProxyConfig,
                          CadastroPublicoService cadastroPublicoService,
                          PasswordResetService passwordResetService,
                          @Value("${app.cookie.secure:true}") boolean cookieSecure) {
        this.auth = auth; this.jwt = jwt; this.users = users; this.usuarios = usuarios;
        this.fotos = fotos; this.organizacoes = organizacoes;
        this.passwordEncoder = passwordEncoder;
        this.loginAttempts = loginAttempts;
        this.trustProxyHeaders = trustProxyHeaders;
        this.trustedProxies = ClientIpResolver.parseTrustedProxies(trustedProxyConfig);
        this.cadastroPublicoService = cadastroPublicoService;
        this.passwordResetService = passwordResetService;
        this.cookieSecure = cookieSecure;
    }

    public AuthController(AuthenticationManager auth, JwtService jwt, UserDetailsService users,
                          UsuarioRepository usuarios, UsuarioFotoRepository fotos, OrganizacaoRepository organizacoes, PasswordEncoder passwordEncoder,
                          LoginAttemptService loginAttempts,
                          String trustedProxyConfig,
                          CadastroPublicoService cadastroPublicoService,
                          PasswordResetService passwordResetService,
                          boolean cookieSecure) {
        this(auth, jwt, users, usuarios, fotos, organizacoes, passwordEncoder, loginAttempts,
             false, trustedProxyConfig, cadastroPublicoService, passwordResetService, cookieSecure);
    }

    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request,
                                                      HttpServletRequest servletRequest,
                                                      HttpServletResponse servletResponse) {
        String ip = ClientIpResolver.resolve(servletRequest, trustProxyHeaders, trustedProxies);
        var status = loginAttempts.check(ip, request.email());
        if (status.blocked()) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Muitas tentativas de login. Tente novamente em " + status.remainingSeconds() + " segundos.");
        }
        try {
            auth.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.senha()));
            loginAttempts.recordSuccess(ip, request.email());
            Usuario cadastro = usuarios.findByEmail(request.email()).orElseThrow();
            return establishSession(cadastro, servletResponse);
        } catch (BadCredentialsException | LockedException e) {
            loginAttempts.recordFailure(ip, request.email());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos.");
        }
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie("", Duration.ZERO).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from("inpetu-token", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/api/v1")
                .maxAge(Duration.ZERO)
                .build().toString());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/auth/session")
    public Map<String, Object> session(Authentication authentication, HttpServletResponse servletResponse) {
        Usuario cadastro = usuarios.findByEmailIgnoreCase(authentication.getName()).orElseThrow();
        var user = users.loadUserByUsername(cadastro.getEmail());
        servletResponse.addHeader(HttpHeaders.SET_COOKIE,
                jwtCookie(jwt.gerar(user, cadastro.getVersaoToken() == null ? 0 : cadastro.getVersaoToken()),
                        Duration.ofMillis(jwt.expirationMs())).toString());
        return sessionPayload(cadastro);
    }

    private ResponseCookie jwtCookie(String value, Duration maxAge) {
        return ResponseCookie.from("inpetu-token", value)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Strict")
            .path("/")
            .maxAge(maxAge)
            .build();
    }

    @PostMapping("/usuarios/cadastro-publico")
    public ResponseEntity<Map<String, String>> cadastro(@Valid @RequestBody CadastroPublicoRequest request,
                                                        HttpServletRequest servletRequest) {
        return cadastroPublicoService.cadastrar(request, servletRequest);
    }

    @PostMapping("/usuarios/confirmar-email")
    public ResponseEntity<Map<String, String>> confirmarEmail(@Valid @RequestBody ConfirmarEmailRequest request) {
        return cadastroPublicoService.confirmarToken(request.token());
    }

    @PostMapping("/usuarios/reenviar-confirmacao")
    public ResponseEntity<Map<String, String>> reenviarConfirmacao(@Valid @RequestBody ReenviarConfirmacaoRequest request) {
        return cadastroPublicoService.reenviarConfirmacao(request.email());
    }

    @PostMapping("/auth/confirmar-codigo")
    public ResponseEntity<Map<String, Object>> confirmarCodigo(@Valid @RequestBody ConfirmarCodigoRequest request,
                                                                HttpServletResponse servletResponse) {
        Usuario cadastro = cadastroPublicoService.confirmarCodigo(request.email(), request.codigo());
        return establishSession(cadastro, servletResponse);
    }

    @PostMapping("/auth/reenviar-codigo")
    public ResponseEntity<Map<String, String>> reenviarCodigo(@Valid @RequestBody ReenviarCodigoRequest request,
                                                               HttpServletRequest servletRequest) {
        return cadastroPublicoService.reenviarCodigo(request.email(), servletRequest);
    }

    @PostMapping("/auth/esqueci-senha")
    public ResponseEntity<Map<String, String>> solicitarRecuperacaoSenha(
        @Valid @RequestBody SolicitarRecuperacaoSenhaRequest request,
        HttpServletRequest servletRequest
    ) {
        return passwordResetService.solicitar(request.email(), servletRequest);
    }

    @PostMapping("/auth/esqueci-senha/validar")
    public ResponseEntity<Map<String, String>> validarCodigoRecuperacao(
        @Valid @RequestBody ValidarRecuperacaoSenhaRequest request,
        HttpServletRequest servletRequest
    ) {
        return passwordResetService.validar(request.email(), request.codigo(), servletRequest);
    }

    @PostMapping("/auth/esqueci-senha/redefinir")
    public ResponseEntity<Map<String, String>> redefinirSenhaRecuperada(
        @Valid @RequestBody RedefinirSenhaRecuperadaRequest request,
        HttpServletRequest servletRequest
    ) {
        return passwordResetService.redefinir(
            request.email(), request.codigo(), request.novaSenha(), servletRequest);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> invalidAuthRequest(MethodArgumentNotValidException error) {
        String field = error.getBindingResult().getFieldError() == null
            ? ""
            : error.getBindingResult().getFieldError().getField();
        String message = switch (field) {
            case "email" -> "Informe um e-mail válido.";
            case "codigo" -> "Informe o código de seis dígitos.";
            case "novaSenha" -> "A nova senha deve ter entre 8 e 64 caracteres.";
            default -> "Revise os dados informados.";
        };
        return ResponseEntity.badRequest().body(Map.of("mensagem", message));
    }

    private ResponseEntity<Map<String, Object>> establishSession(Usuario cadastro, HttpServletResponse servletResponse) {
        var user = users.loadUserByUsername(cadastro.getEmail());
        servletResponse.addHeader(HttpHeaders.SET_COOKIE,
            jwtCookie(jwt.gerar(user, cadastro.getVersaoToken() == null ? 0 : cadastro.getVersaoToken()),
                Duration.ofMillis(jwt.expirationMs())).toString());
        return ResponseEntity.ok(sessionPayload(cadastro));
    }

    private Map<String, Object> sessionPayload(Usuario cadastro) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("nome", cadastro.getNomeCompleto());
        payload.put("perfil", cadastro.getIdPerfil());
        payload.put("email", cadastro.getEmail());
        payload.put("telefone", cadastro.getTelefone());
        payload.put("idUsuario", cadastro.getIdUsuario());
        payload.put("senhaTemporaria", Boolean.TRUE.equals(cadastro.getSenhaTemporaria()));
        var foto = fotos.findById(cadastro.getIdUsuario()).orElse(null);
        payload.put("temFoto", foto != null);
        payload.put("fotoVersao", foto == null ? 0L : foto.getAtualizadaEm()
                .toInstant(java.time.ZoneOffset.UTC).toEpochMilli());
        return payload;
    }

    private ResponseEntity<Map<String, String>> publicSignupAccepted() {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("mensagem", PUBLIC_SIGNUP_MESSAGE));
    }
}
