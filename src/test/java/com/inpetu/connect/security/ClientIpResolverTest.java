package com.inpetu.connect.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ClientIpResolverTest {

    @Test
    void whenTrustProxyHeadersIsTrue_readsXRealIpBehindSimulatedProxy() {
        MockHttpServletRequest client1 = proxyRequest("10.0.0.2", "198.51.100.10", "203.0.113.1, 10.0.0.2");
        MockHttpServletRequest client2 = proxyRequest("10.0.0.2", "198.51.100.20", "203.0.113.2, 10.0.0.2");

        String ip1 = ClientIpResolver.resolve(client1, true);
        String ip2 = ClientIpResolver.resolve(client2, true);

        assertEquals("198.51.100.10", ip1);
        assertEquals("198.51.100.20", ip2);
        assertNotEquals(ip1, ip2, "Dois clientes com IPs diferentes atrás do mesmo proxy devem ter IPs resolvidos distintos");
    }

    @Test
    void whenTrustProxyHeadersIsTrue_neverUsesXForwardedFor() {
        MockHttpServletRequest request = proxyRequest("10.0.0.2", "198.51.100.10", "203.0.113.99, 1.2.3.4");

        String ip = ClientIpResolver.resolve(request, true);

        assertEquals("198.51.100.10", ip, "X-Forwarded-For deve ser completamente ignorado; somente X-Real-IP é lido");
    }

    @Test
    void whenTrustProxyHeadersIsFalse_ignoresForgedHeadersAndUsesRemoteAddr() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.55");
        request.addHeader("X-Real-IP", "198.51.100.99");
        request.addHeader("X-Forwarded-For", "1.2.3.4, 5.6.7.8");

        String ip = ClientIpResolver.resolve(request, false);

        assertEquals("203.0.113.55", ip, "Com a flag desligada, deve usar request.getRemoteAddr() e ignorar X-Real-IP e X-Forwarded-For");
    }

    @Test
    void whenTrustedProxiesAreConfigured_onlyTrustsWhenPeerIsInTrustedList() {
        Set<String> trusted = Set.of("10.0.0.2", "10.0.0.3");

        MockHttpServletRequest trustedPeer = proxyRequest("10.0.0.2", "198.51.100.10", null);
        MockHttpServletRequest untrustedPeer = proxyRequest("198.51.100.55", "10.0.0.1", null);

        assertEquals("198.51.100.10", ClientIpResolver.resolve(trustedPeer, true, trusted));
        assertEquals("198.51.100.55", ClientIpResolver.resolve(untrustedPeer, true, trusted));
    }

    @Test
    void serverForwardHeadersStrategyFramework_altersRemoteAddrWithXForwardedFor() throws Exception {
        org.springframework.web.filter.ForwardedHeaderFilter filter = new org.springframework.web.filter.ForwardedHeaderFilter();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.2");
        request.addHeader("X-Forwarded-For", "198.51.100.55");
        request.addHeader("X-Forwarded-Proto", "https");
        request.addHeader("X-Forwarded-Host", "inpetu.example.com");

        java.util.concurrent.atomic.AtomicReference<String> remoteAddrAfterFilter = new java.util.concurrent.atomic.AtomicReference<>();

        filter.doFilter(request, new org.springframework.mock.web.MockHttpServletResponse(), new org.springframework.mock.web.MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
                remoteAddrAfterFilter.set(req.getRemoteAddr());
            }
        });

        assertEquals("198.51.100.55", remoteAddrAfterFilter.get(),
            "ForwardedHeaderFilter (strategy=framework) altera request.getRemoteAddr() a partir de X-Forwarded-For");
    }

    private MockHttpServletRequest proxyRequest(String remoteAddr, String realIp, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        if (realIp != null) request.addHeader("X-Real-IP", realIp);
        if (forwardedFor != null) request.addHeader("X-Forwarded-For", forwardedFor);
        return request;
    }
}
