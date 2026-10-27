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

    public static String resolve(HttpServletRequest request, boolean trustProxyHeaders) {
        return resolve(request, trustProxyHeaders, Set.of());
    }

    public static String resolve(HttpServletRequest request, boolean trustProxyHeaders, Set<String> trustedProxies) {
        HttpServletRequest raw = getRawRequest(request);
        String rawRemote = raw.getRemoteAddr();
        if (!trustProxyHeaders) {
            return rawRemote;
        }
        if (trustedProxies != null && !trustedProxies.isEmpty()) {
            String normalizedRemote = normalize(rawRemote);
            if (normalizedRemote == null || !trustedProxies.contains(normalizedRemote)) {
                return rawRemote;
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return rawRemote;
    }

    private static HttpServletRequest getRawRequest(HttpServletRequest request) {
        HttpServletRequest current = request;
        while (current instanceof jakarta.servlet.http.HttpServletRequestWrapper wrapper) {
            if (wrapper.getRequest() instanceof HttpServletRequest inner) {
                current = inner;
            } else {
                break;
            }
        }
        return current;
    }

    public static String resolve(HttpServletRequest request, Set<String> trustedProxies) {
        boolean trust = trustedProxies != null && !trustedProxies.isEmpty();
        return resolve(request, trust, trustedProxies);
    }

    private static String normalize(String address) {
        return address == null ? null : address.trim().toLowerCase(Locale.ROOT);
    }
}
