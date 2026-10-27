package com.inpetu.connect.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

class LoginAttemptServiceTest {
    @Test
    void bloqueiaIpDepoisDeVariosErrosConsecutivos() {
        LoginAttemptService service = new LoginAttemptService(3, 60);

        assertFalse(service.check("10.0.0.1").blocked());

        service.recordFailure("10.0.0.1");
        service.recordFailure("10.0.0.1");
        assertFalse(service.check("10.0.0.1").blocked());

        service.recordFailure("10.0.0.1");
        var status = service.check("10.0.0.1");

        assertTrue(status.blocked());
        assertTrue(status.remainingSeconds() > 0);
    }

    @Test
    void limpaFalhasQuandoLoginTemSucesso() {
        LoginAttemptService service = new LoginAttemptService(2, 60);

        service.recordFailure("10.0.0.2");
        service.recordFailure("10.0.0.2");
        assertTrue(service.check("10.0.0.2").blocked());

        service.recordSuccess("10.0.0.2");
        assertFalse(service.check("10.0.0.2").blocked());
    }

    @Test
    void forwardedHeaderForgedFromUntrustedRemoteDoesNotBypassIpLockout() {
        LoginAttemptService service = new LoginAttemptService(1, 60);
        MockHttpServletRequest first = request("10.0.0.10", "203.0.113.1");
        MockHttpServletRequest second = request("10.0.0.10", "198.51.100.8");

        String firstIp = ClientIpResolver.resolve(first, Set.of());
        service.recordFailure(firstIp, "person@example.test");
        String secondIp = ClientIpResolver.resolve(second, Set.of());

        assertEquals("10.0.0.10", firstIp);
        assertEquals(firstIp, secondIp);
        assertTrue(service.check(secondIp, "person@example.test").blocked());
    }

    @Test
    void locksNormalizedAccountAcrossDifferentIpAddresses() {
        LoginAttemptService service = new LoginAttemptService(2, 60);

        service.recordFailure("10.0.0.1", " Person@Example.Test ");
        assertFalse(service.check("10.0.0.2", "person@example.test").blocked());
        service.recordFailure("10.0.0.2", "person@example.test");

        var status = service.check("10.0.0.3", "PERSON@example.test");
        assertTrue(status.blocked());
        assertTrue(status.remainingSeconds() > 0);
    }

    @Test
    void separateCountersBehindProxy_limitDoesNotBecomeGlobal() {
        LoginAttemptService service = new LoginAttemptService(2, 60);
        MockHttpServletRequest client1 = proxyRequest("10.0.0.2", "198.51.100.10");
        MockHttpServletRequest client2 = proxyRequest("10.0.0.2", "198.51.100.20");

        String ip1 = ClientIpResolver.resolve(client1, true);
        String ip2 = ClientIpResolver.resolve(client2, true);

        // Cliente 1 erra duas vezes e é bloqueado
        service.recordFailure(ip1);
        service.recordFailure(ip1);
        assertTrue(service.check(ip1).blocked());

        // Cliente 2 atrás do mesmo proxy NÃO é bloqueado
        assertFalse(service.check(ip2).blocked(), "O limite por IP não deve ser global atrás de proxy");
    }

    @Test
    void forgedHeadersDoNotEscapeLockoutBehindProxyOrDirectly() {
        LoginAttemptService service = new LoginAttemptService(1, 60);
        MockHttpServletRequest request1 = new MockHttpServletRequest();
        request1.setRemoteAddr("10.0.0.2");
        request1.addHeader("X-Real-IP", "198.51.100.10");
        request1.addHeader("X-Forwarded-For", "203.0.113.1");

        String ip1 = ClientIpResolver.resolve(request1, true);
        service.recordFailure(ip1);
        assertTrue(service.check(ip1).blocked());

        // Cliente 1 altera X-Forwarded-For para tentar escapar
        MockHttpServletRequest request2 = new MockHttpServletRequest();
        request2.setRemoteAddr("10.0.0.2");
        request2.addHeader("X-Real-IP", "198.51.100.10");
        request2.addHeader("X-Forwarded-For", "203.0.113.99, 1.2.3.4");

        String ip2 = ClientIpResolver.resolve(request2, true);
        assertEquals(ip1, ip2);
        assertTrue(service.check(ip2).blocked(), "X-Forwarded-For forjado não escapa do bloqueio");
    }

    private MockHttpServletRequest proxyRequest(String remoteAddress, String realIp) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddress);
        if (realIp != null) request.addHeader("X-Real-IP", realIp);
        return request;
    }

    private MockHttpServletRequest request(String remoteAddress, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddress);
        request.addHeader("X-Forwarded-For", forwardedFor);
        request.addHeader("X-Real-IP", "198.51.100.200");
        return request;
    }
}
