package com.inpetu.connect.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

@Component
public class RateLimitSecretValidator {
    private static final Logger logger = LoggerFactory.getLogger(RateLimitSecretValidator.class);
    private static final int MINIMUM_SECRET_LENGTH = 32;

    private final String secret;
    private final boolean mailEnabled;
    private final boolean devProfile;

    public RateLimitSecretValidator(
        @Value("${APP_RATE_LIMIT_SECRET:}") String secret,
        @Value("${app.mail.enabled:false}") boolean mailEnabled,
        Environment environment
    ) {
        this.secret = secret;
        this.mailEnabled = mailEnabled;
        this.devProfile = environment.acceptsProfiles(Profiles.of("dev"));
    }

    @PostConstruct
    void validate() {
        if (secret == null || secret.isBlank()) {
            if (mailEnabled) {
                throw new IllegalStateException(
                    "APP_RATE_LIMIT_SECRET é obrigatório quando o cadastro público está ativo");
            }
            if (devProfile) {
                logger.warn("APP_RATE_LIMIT_SECRET está vazio no perfil dev; os limites permanecem ativos sem proteção por chave.");
                return;
            }
            throw new IllegalStateException("APP_RATE_LIMIT_SECRET deve conter pelo menos 32 caracteres.");
        }
        if (secret.length() < MINIMUM_SECRET_LENGTH) {
            throw new IllegalStateException("APP_RATE_LIMIT_SECRET deve conter pelo menos 32 caracteres.");
        }
    }
}
