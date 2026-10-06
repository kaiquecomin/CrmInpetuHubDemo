package com.inpetu.connect.db;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Informa ao site quais bancos existem e qual está ativo na requisição atual. */
@RestController
@RequestMapping("/api/v1/database")
public class DbController {
    private final DbRegistry registry;

    public DbController(DbRegistry registry) { this.registry = registry; }

    @GetMapping
    public Map<String, Object> info() {
        return Map.of("atual", DbContext.get(), "testeDisponivel", registry.testEnabled());
    }
}
