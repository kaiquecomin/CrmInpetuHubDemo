package com.inpetu.connect.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OtpSecretValidator {
    private final String secret;

    public OtpSecretValidator(@Value("${OTP_SECRET:}") String secret) {
        this.secret = secret;
    }

    @PostConstruct
    void validate() {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("OTP_SECRET deve conter pelo menos 32 caracteres.");
        }
    }
}
