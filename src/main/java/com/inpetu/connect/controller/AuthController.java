package com.inpetu.connect.controller;

import com.inpetu.connect.dto.*;
import com.inpetu.connect.model.*;
import com.inpetu.connect.repository.*;
import com.inpetu.connect.security.JwtService;
import com.inpetu.connect.security.LoginAttemptService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController @RequestMapping("/api/v1")
public class AuthController {
    private final AuthenticationManager auth;
    private final JwtService jwt;
    private final UserDetailsService users;
    private final UsuarioRepository usuarios;
    private final OrganizacaoRepository organizacoes;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttempts;

    public AuthController(AuthenticationManager auth, JwtService jwt, UserDetailsService users,
                          UsuarioRepository usuarios, OrganizacaoRepository organizacoes, PasswordEncoder passwordEncoder,
                          LoginAttemptService loginAttempts) {
        this.auth = auth; this.jwt = jwt; this.users = users; this.usuarios = usuarios; this.organizacoes = organizacoes;
        this.passwordEncoder = passwordEncoder;
        this.loginAttempts = loginAttempts;
    }
    @PostMapping("/auth/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String ip = resolveClientIp(servletRequest);
        var status = loginAttempts.check(ip);
        if (status.blocked()) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Muitas tentativas de login para este IP. Tente novamente em " + status.remainingSeconds() + " segundos.");
        }
        try {
            auth.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.senha()));
            loginAttempts.recordSuccess(ip);
            var user = users.loadUserByUsername(request.email());
            Usuario cadastro = usuarios.findByEmail(request.email()).orElseThrow();
            return Map.of("token", jwt.gerar(user), "nome", cadastro.getNomeCompleto(), "perfil", cadastro.getIdPerfil(), "email", cadastro.getEmail());
        } catch (BadCredentialsException | LockedException e) {
            loginAttempts.recordFailure(ip);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos.");
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
    @PostMapping("/usuarios/cadastro-publico")
    public ResponseEntity<?> cadastro(@Valid @RequestBody CadastroPublicoRequest request) {
        if (usuarios.existsByEmail(request.email())) return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("mensagem", "Este e-mail já está cadastrado."));
        Organizacao org = organizacoes.findByNomeOrganizacaoIgnoreCase(request.organizacao().trim()).orElseGet(() -> {
            Organizacao nova = new Organizacao(); nova.setNomeOrganizacao(request.organizacao().trim()); nova.setTipoOrganizacao("Pendente de classificação"); return organizacoes.save(nova);
        });
        Usuario usuario = new Usuario(); usuario.setNomeCompleto(request.nomeCompleto().trim()); usuario.setEmail(request.email().trim().toLowerCase());
        usuario.setTelefone(request.telefone()); usuario.setCargoVinculo(request.cargoVinculo().trim());
        usuario.setSenhaHash(passwordEncoder.encode(request.senha())); usuario.setIdPerfil(4); usuario.setIdPersona(null);
        usuario.setIdOrganizacao(org.getIdOrganizacao()); usuario.setAtivo(true);
        Usuario criado = usuarios.save(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", criado.getIdUsuario(), "mensagem", "Cadastro recebido."));
    }
}
