package com.inpetu.connect.security;

import org.junit.jupiter.api.Test;

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
}
