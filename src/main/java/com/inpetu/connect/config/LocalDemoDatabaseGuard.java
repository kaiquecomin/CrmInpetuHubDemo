package com.inpetu.connect.config;

import java.net.URI;
import java.util.List;
import java.util.Locale;

final class LocalDemoDatabaseGuard {
    private LocalDemoDatabaseGuard() {}

    static void requireLocalMySql(String jdbcUrl) {
        String prefix = "jdbc:mysql:";
        if (jdbcUrl == null || !jdbcUrl.startsWith(prefix)) {
            throw new IllegalStateException("A carga de demonstração só pode usar um banco MySQL local.");
        }
        try {
            String host = URI.create(jdbcUrl.substring(prefix.length())).getHost();
            String normalizedHost = host == null ? "" : host.toLowerCase(Locale.ROOT);
            if (normalizedHost.startsWith("[") && normalizedHost.endsWith("]")) {
                normalizedHost = normalizedHost.substring(1, normalizedHost.length() - 1);
            }
            if (!List.of("localhost", "127.0.0.1", "::1").contains(normalizedHost)) {
                throw new IllegalStateException("A carga de demonstração só pode usar um banco MySQL local.");
            }
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("A carga de demonstração só pode usar um banco MySQL local.", ex);
        }
    }
}
