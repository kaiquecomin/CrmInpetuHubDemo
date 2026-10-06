package com.inpetu.connect.db;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Lê o cabeçalho X-Database (ou o parâmetro ?db=, usado por <img>) e define o banco da requisição.
 * Roda ANTES do Spring Security, porque o login e a validação do token já consultam o banco.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DbContextFilter extends OncePerRequestFilter {
    private final DbRegistry registry;

    public DbContextFilter(DbRegistry registry) { this.registry = registry; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String pedido = request.getHeader("X-Database");
        if (pedido == null) pedido = request.getParameter("db");
        String db = DbContext.normalizar(pedido);
        if (DbContext.TEST.equals(db) && !registry.testEnabled()) db = DbContext.MAIN;
        DbContext.set(db);
        response.setHeader("X-Database", db);
        try { chain.doFilter(request, response); }
        finally { DbContext.clear(); }
    }
}
