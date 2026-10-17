package com.inpetu.connect.config;

import com.inpetu.connect.repository.UsuarioRepository;
import com.inpetu.connect.security.JwtAuthenticationFilter;
import com.inpetu.connect.security.SenhaTemporariaFilter;
import com.inpetu.connect.security.TestDatabaseHeaderFilter;
import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import org.springframework.http.HttpMethod;
import java.util.Arrays;
import java.util.List;

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
                                          AuthenticationProvider provider) throws Exception {
        return http.csrf(csrf -> csrf.disable()).cors(cors -> {}).sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(provider).authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/login", "/api/v1/auth/logout",
                    "/api/v1/auth/confirmar-codigo", "/api/v1/auth/reenviar-codigo",
                    "/api/v1/usuarios/cadastro-publico", "/api/v1/usuarios/confirmar-email",
                    "/api/v1/usuarios/reenviar-confirmacao").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/auth/session").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/espacos/**", "/api/v1/ecossistema", "/api/v1/ecossistema/*/logo").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/duvidas").permitAll()
                .requestMatchers("/confirmar", "/verificar-email", "/paineladm").permitAll()
                .requestMatchers("/api/v1/dev/email-preview").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(temporaryPasswordFilter, JwtAuthenticationFilter.class)
            .addFilterAfter(new TestDatabaseHeaderFilter(), JwtAuthenticationFilter.class).build();
    }
    @Bean CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origin}") String origins) {
        List<String> allowedOrigins = Arrays.stream(origins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .distinct()
            .toList();
        CorsConfiguration config = new CorsConfiguration(); config.setAllowedOrigins(allowedOrigins); config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Database")); config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**", config); return source;
    }
}