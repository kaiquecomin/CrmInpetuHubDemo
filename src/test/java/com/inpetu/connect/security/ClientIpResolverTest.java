package com.inpetu.connect.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ClientIpResolverTest {
    @Test
    void ignoresForgedLeftmostAddressesAndUsesTheLastUntrustedAddressFromTrustedProxyChain() {
        Set<String> trustedProxies = Set.of("10.0.0.2", "10.0.0.3");
        String first = resolve("198.51.100.1, 203.0.113.42, 10.0.0.3", trustedProxies);
        String second = resolve("198.51.100.200, 203.0.113.42, 10.0.0.3", trustedProxies);

        assertEquals("203.0.113.42", first);
        assertEquals(first, second);
    }

    @Test
    void ignoresForwardedHeaderWhenImmediatePeerIsNotTrusted() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.55");
        request.addHeader("X-Forwarded-For", "203.0.113.42");

        assertEquals("198.51.100.55", ClientIpResolver.resolve(request, Set.of("10.0.0.2")));
    }

    @Test
    void keepsTomcatResolvedClientAddressInsteadOfTrustingForgedHeaderPrefix() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.42");
        request.addHeader("X-Forwarded-For", "198.51.100.1, 203.0.113.42");

        assertEquals("203.0.113.42",
            ClientIpResolver.resolve(request, Set.of("10.0.0.2", "10.0.0.3")));
    }

    private String resolve(String forwardedFor, Set<String> trustedProxies) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.2");
        request.addHeader("X-Forwarded-For", forwardedFor);
        return ClientIpResolver.resolve(request, trustedProxies);
    }
}
