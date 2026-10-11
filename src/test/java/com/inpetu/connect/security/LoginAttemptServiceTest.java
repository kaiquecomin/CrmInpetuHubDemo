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
    void usesLastUntrustedAddressOnlyBehindConfiguredTrustedProxy() {
        MockHttpServletRequest request = request("10.0.0.2", "192.0.2.5, 10.0.0.1");
        Set<String> trusted = ClientIpResolver.parseTrustedProxies("10.0.0.1,10.0.0.2");

        assertEquals("192.0.2.5", ClientIpResolver.resolve(request, trusted));
    }

    private MockHttpServletRequest request(String remoteAddress, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddress);
        request.addHeader("X-Forwarded-For", forwardedFor);
        request.addHeader("X-Real-IP", "198.51.100.200");
        return request;
    }
}
