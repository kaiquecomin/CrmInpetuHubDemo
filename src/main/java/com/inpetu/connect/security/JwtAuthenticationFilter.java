package com.inpetu.connect.security;

import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.UsuarioRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserDetailsService users;
    private final UsuarioRepository usuarios;
    public JwtAuthenticationFilter(JwtService jwt, UserDetailsService users, UsuarioRepository usuarios) {
        this.jwt = jwt;
        this.users = users;
        this.usuarios = usuarios;
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String token = cookieToken(request);
        if (token == null) {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) token = header.substring(7);
        }
        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                String email = jwt.extrairEmail(token); UserDetails user = users.loadUserByUsername(email);
                Usuario cadastro = usuarios.findByEmailIgnoreCase(email).orElse(null);
                int versaoToken = cadastro == null || cadastro.getVersaoToken() == null ? 0 : cadastro.getVersaoToken();
                if (cadastro != null && jwt.valido(token, user, versaoToken)) {
                    var auth = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request)); SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (JwtException | UsernameNotFoundException ignored) { SecurityContextHolder.clearContext(); }
        }
        chain.doFilter(request, response);
    }

    private String cookieToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if ("inpetu-token".equals(cookie.getName()) && !cookie.getValue().isBlank()) return cookie.getValue();
        }
        return null;
    }
}
