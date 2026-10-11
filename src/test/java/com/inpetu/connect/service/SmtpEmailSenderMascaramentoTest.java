package com.inpetu.connect.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SmtpEmailSenderMascaramentoTest {
    private final SmtpEmailSender sender = new SmtpEmailSender(
        RestClient.builder().build(), false, "", "", "", "");

    @Test
    void masksAddressKeepingOnlyFirstCharacterAndFinalDomain() throws Exception {
        assertEquals("u***@***.br", maskedEmail("usuario@exemplo.test.br"));
    }

    @Test
    void returnsGenericMaskForInvalidAddresses() throws Exception {
        assertEquals("***", maskedEmail(null));
        assertEquals("***", maskedEmail("sem-arroba"));
        assertEquals("***", maskedEmail("sem-ponto@dominio"));
    }

    private String maskedEmail(String email) throws Exception {
        Method method = SmtpEmailSender.class.getDeclaredMethod("maskedEmail", String.class);
        method.setAccessible(true);
        return (String) method.invoke(sender, email);
    }
}
