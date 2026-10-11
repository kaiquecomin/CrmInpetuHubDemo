package com.inpetu.connect.service;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.security.SecureRandom;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RateLimitSecretValidatorTest {
    @Test
    void missingSecretWithPublicSignupEnabledFailsWithRequiredMessage() {
        RateLimitSecretValidator validator =
            new RateLimitSecretValidator("", true, new MockEnvironment());

        IllegalStateException exception = assertThrows(IllegalStateException.class, validator::validate);

        assertEquals("APP_RATE_LIMIT_SECRET é obrigatório quando o cadastro público está ativo",
            exception.getMessage());
    }

    @Test
    void missingSecretIsAllowedOnlyInDevWhenMailIsDisabled() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");
        RateLimitSecretValidator validator = new RateLimitSecretValidator("", false, environment);

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void shortSecretFailsWithoutEchoingItsValue() {
        byte[] value = new byte[24];
        new SecureRandom().nextBytes(value);
        String shortSecret = Base64.getUrlEncoder().withoutPadding().encodeToString(value).substring(0, 31);
        RateLimitSecretValidator validator =
            new RateLimitSecretValidator(shortSecret, false, new MockEnvironment());

        IllegalStateException exception = assertThrows(IllegalStateException.class, validator::validate);

        assertEquals("APP_RATE_LIMIT_SECRET deve conter pelo menos 32 caracteres.",
            exception.getMessage());
        org.junit.jupiter.api.Assertions.assertFalse(exception.getMessage().contains(shortSecret));
    }
}
