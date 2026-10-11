package com.inpetu.connect.service;

import com.inpetu.connect.model.CadastroPendente;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Properties;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SmtpEmailSenderTest {
    @Test
    void sendsEncodedRawTokenAndOnlyNecessaryMessageContent() throws Exception {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(message);
        String rawToken = randomToken();
        String email = "teste+" + UUID.randomUUID() + "@exemplo.test";
        CadastroPendente pending = new CadastroPendente();
        pending.setEmail(email);
        pending.setTokenHash(randomToken());

        SmtpEmailSender sender = new SmtpEmailSender(
            mailSender, true, "https://connect.example.test/", "sistema@exemplo.test", "");
        sender.sendConfirmation(pending, rawToken);

        verify(mailSender).send(message);
        String body = (String) message.getContent();
        String expectedLink = "https://connect.example.test/confirmar?token=" +
            URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
        assertTrue(body.contains(expectedLink), "O link deve conter o token bruto codificado.");
        assertFalse(body.contains(pending.getTokenHash()), "O hash não deve ser enviado.");
        assertFalse(body.contains(email), "O corpo não deve incluir o endereço do destinatário.");
        assertFalse(body.toLowerCase().contains("senha"), "O corpo não deve incluir senha.");
    }

    @Test
    void refusesToSendWhenPublicUrlIsEmpty() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        CadastroPendente pending = new CadastroPendente();
        pending.setEmail("teste+" + UUID.randomUUID() + "@exemplo.test");
        SmtpEmailSender sender = new SmtpEmailSender(
            mailSender, true, " ", "sistema@exemplo.test", "");
        String rawToken = randomToken();

        IllegalStateException exception = assertThrows(
            IllegalStateException.class, () -> sender.sendConfirmation(pending, rawToken));

        assertFalse(exception.getMessage().contains(rawToken));
    }

    private static String randomToken() {
        byte[] value = new byte[32];
        new SecureRandom().nextBytes(value);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }
}
