package com.inpetu.connect.config;

import com.inpetu.connect.repository.UsuarioRepository;
import com.inpetu.connect.security.JwtAuthenticationFilter;
import com.inpetu.connect.security.SenhaTemporariaFilter;
import com.inpetu.connect.security.TestDatabaseHeaderFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.cors.*;
import java.io.IOException;
import org.springframework.http.HttpMethod;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Configuration @EnableWebSecurity @EnableMethodSecurity
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean UserDetailsService userDetailsService(UsuarioRepository usuarios) {
        return email -> usuarios.findByEmail(email).filter(u -> Boolean.TRUE.equals(u.getAtivo())).map(u -> {
            String role = switch (u.getIdPerfil()) { case 1 -> "COORDENADOR"; case 2 -> "GESTOR_ESPACOS"; case 3 -> "STAFF"; default -> "SOLICITANTE"; };
            return User.withUsername(u.getEmail()).password(u.getSenhaHash() == null ? "{noop}disabled" : u.getSenhaHash()).roles(role).build();
        }).orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
    }
    @Bean AuthenticationProvider authenticationProvider(UserDetailsService users, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(users); provider.setPasswordEncoder(encoder); return provider;
    }
    @Bean AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception { return configuration.getAuthenticationManager(); }
    @Bean SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter,
                                          SenhaTemporariaFilter temporaryPasswordFilter,
                                          AuthenticationProvider provider, ObjectMapper objectMapper,
                                          ObjectProvider<OptionalFeatureModule> optionalModules) throws Exception {
        List<RequestMatcher> optionalFeatureRoutes = optionalModules.orderedStream()
            .flatMap(module -> module.securityBypassMatchers().stream())
            .toList();
        var authorization = http.csrf(csrf -> csrf.disable()).cors(cors -> {}).sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(provider).authorizeHttpRequests(auth -> {
                auth.requestMatchers("/api/v1/auth/login", "/api/v1/auth/logout",
                    "/api/v1/auth/confirmar-codigo", "/api/v1/auth/reenviar-codigo",
                    "/api/v1/auth/esqueci-senha", "/api/v1/auth/esqueci-senha/validar",
                    "/api/v1/auth/esqueci-senha/redefinir",
                    "/api/v1/usuarios/cadastro-publico", "/api/v1/usuarios/confirmar-email",
                    "/api/v1/usuarios/reenviar-confirmacao").permitAll();
                auth.requestMatchers(HttpMethod.GET, "/api/v1/auth/session").authenticated();
                auth.requestMatchers("/api/v1/config").permitAll();
                optionalFeatureRoutes.forEach(matcher -> auth.requestMatchers(matcher).permitAll());
                auth.requestMatchers(HttpMethod.GET, "/api/v1/espacos/**", "/api/v1/ecossistema", "/api/v1/ecossistema/*/logo").permitAll();
                auth.requestMatchers(HttpMethod.POST, "/api/v1/duvidas").permitAll();
                auth.requestMatchers("/confirmar", "/verificar-email", "/paineladm").permitAll();
                auth.requestMatchers("/api/v1/dev/email-preview").permitAll();
                auth.requestMatchers("/api/**").authenticated();
                auth.anyRequest().permitAll();
            });
        return authorization.exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, exception) -> writeSecurityError(
                    response, objectMapper, HttpStatus.UNAUTHORIZED,
                    "SESSAO_EXPIRADA", "Sua sessão expirou. Entre novamente."))
                .accessDeniedHandler((request, response, exception) -> writeSecurityError(
                    response, objectMapper, HttpStatus.FORBIDDEN,
                    "SEM_PERMISSAO", "Você não tem permissão para esta ação.")))
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(temporaryPasswordFilter, JwtAuthenticationFilter.class)
            .addFilterAfter(new TestDatabaseHeaderFilter(), JwtAuthenticationFilter.class).build();
    }
    private static void writeSecurityError(jakarta.servlet.http.HttpServletResponse response,
                                           ObjectMapper objectMapper, HttpStatus status,
                                           String code, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), Map.of("codigo", code, "mensagem", message));
    }
    @Bean CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origin}") String origins) {
        List<String> allowedOrigins = Arrays.stream(origins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .distinct()
            .toList();
        CorsConfiguration config = new CorsConfiguration(); config.setAllowedOrigins(allowedOrigins); config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Database"));
        config.setExposedHeaders(List.of(HttpHeaders.RETRY_AFTER)); config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**", config); return source;
    }
}