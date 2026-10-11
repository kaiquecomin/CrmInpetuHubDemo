package com.inpetu.connect.security;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

public final class ClientIpResolver {
    private ClientIpResolver() {
    }

    public static Set<String> parseTrustedProxies(String configuredProxies) {
        if (configuredProxies == null || configuredProxies.isBlank()) return Set.of();
        return Arrays.stream(configuredProxies.split(","))
            .map(String::trim)
            .filter(proxy -> !proxy.isEmpty())
            .map(ClientIpResolver::normalize)
            .collect(Collectors.toUnmodifiableSet());
    }

    public static String resolve(HttpServletRequest request, Set<String> trustedProxies) {
        String remoteAddress = request.getRemoteAddr();
        String normalizedRemote = normalize(remoteAddress);
        if (normalizedRemote == null || !trustedProxies.contains(normalizedRemote)) {
            return remoteAddress;
        }

        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor == null || forwardedFor.isBlank()) return remoteAddress;
        String[] addresses = forwardedFor.split(",");
        for (int index = addresses.length - 1; index >= 0; index--) {
            String candidate = addresses[index].trim();
            if (!candidate.isEmpty() && !trustedProxies.contains(normalize(candidate))) {
                return candidate;
            }
        }
        return remoteAddress;
    }

    private static String normalize(String address) {
        return address == null ? null : address.trim().toLowerCase(Locale.ROOT);
    }
}
