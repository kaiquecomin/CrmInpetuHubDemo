package com.inpetu.connect.security;

import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class SenhaTemporariaFilter extends OncePerRequestFilter {
    private final UsuarioRepository usuarios;

    public SenhaTemporariaFilter(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && request.getRequestURI().startsWith("/api/")) {
            Usuario usuario = usuarios.findByEmailIgnoreCase(authentication.getName()).orElse(null);
            if (usuario != null && Boolean.TRUE.equals(usuario.getSenhaTemporaria())
                    && !isAllowedDuringTemporaryPassword(request)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write("{\"codigo\":\"SENHA_TEMPORARIA\",\"mensagem\":\"Defina uma nova senha para continuar.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private boolean isAllowedDuringTemporaryPassword(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        return ("PUT".equals(method) && "/api/v1/usuarios/me/senha".equals(path))
                || ("POST".equals(method) && "/api/v1/auth/logout".equals(path))
                || ("GET".equals(method) && "/api/v1/auth/session".equals(path));
    }
}
