package com.inpetu.connect.controller;

import com.inpetu.connect.dto.*;
import com.inpetu.connect.model.*;
import com.inpetu.connect.repository.*;
import com.inpetu.connect.security.JwtService;
import com.inpetu.connect.security.ClientIpResolver;
import com.inpetu.connect.security.LoginAttemptService;
import com.inpetu.connect.service.CadastroPublicoService;
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
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.Set;
import java.util.Map;

@RestController @RequestMapping("/api/v1")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private static final String PUBLIC_SIGNUP_MESSAGE = "Enviamos um e-mail com as instruções de acesso.";

    private final AuthenticationManager auth;
    private final JwtService jwt;
    private final UserDetailsService users;
    private final UsuarioRepository usuarios;
    private final OrganizacaoRepository organizacoes;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttempts;
    private final Set<String> trustedProxies;
    private final CadastroPublicoService cadastroPublicoService;

    public AuthController(AuthenticationManager auth, JwtService jwt, UserDetailsService users,
                          UsuarioRepository usuarios, OrganizacaoRepository organizacoes, PasswordEncoder passwordEncoder,
                          LoginAttemptService loginAttempts,
                          @Value("${app.security.trusted-proxies:}") String trustedProxyConfig,
                          CadastroPublicoService cadastroPublicoService) {
        this.auth = auth; this.jwt = jwt; this.users = users; this.usuarios = usuarios; this.organizacoes = organizacoes;
        this.passwordEncoder = passwordEncoder;
        this.loginAttempts = loginAttempts;
        this.trustedProxies = ClientIpResolver.parseTrustedProxies(trustedProxyConfig);
        this.cadastroPublicoService = cadastroPublicoService;
    }
    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request,
                                                      HttpServletRequest servletRequest,
                                                      HttpServletResponse servletResponse) {
        String ip = ClientIpResolver.resolve(servletRequest, trustedProxies);
        var status = loginAttempts.check(ip, request.email());
        if (status.blocked()) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Muitas tentativas de login. Tente novamente em " + status.remainingSeconds() + " segundos.");
        }
        try {
            auth.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.senha()));
            loginAttempts.recordSuccess(ip, request.email());
            var user = users.loadUserByUsername(request.email());
            Usuario cadastro = usuarios.findByEmail(request.email()).orElseThrow();
            servletResponse.addHeader(HttpHeaders.SET_COOKIE,
                jwtCookie(jwt.gerar(user), Duration.ofMillis(jwt.expirationMs())).toString());
            return ResponseEntity.ok(Map.of("nome", cadastro.getNomeCompleto(), "perfil", cadastro.getIdPerfil(), "email", cadastro.getEmail()));
        } catch (BadCredentialsException | LockedException e) {
            loginAttempts.recordFailure(ip, request.email());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos.");
        }
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie("", Duration.ZERO).toString());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/auth/session")
    public Map<String, Object> session(Authentication authentication) {
        Usuario cadastro = usuarios.findByEmailIgnoreCase(authentication.getName()).orElseThrow();
        return Map.of("nome", cadastro.getNomeCompleto(), "perfil", cadastro.getIdPerfil(), "email", cadastro.getEmail());
    }

    private ResponseCookie jwtCookie(String value, Duration maxAge) {
        return ResponseCookie.from("inpetu-token", value)
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/api/v1")
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

    private ResponseEntity<Map<String, String>> publicSignupAccepted() {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("mensagem", PUBLIC_SIGNUP_MESSAGE));
    }
}
