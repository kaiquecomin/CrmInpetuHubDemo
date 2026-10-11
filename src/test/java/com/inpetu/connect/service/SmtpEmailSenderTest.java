package com.inpetu.connect.service;

import com.inpetu.connect.model.CadastroPendente;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(OutputCaptureExtension.class)
class SmtpEmailSenderTest {
    private static final String API_URL = "https://api.brevo.com/v3/smtp/email";
    private static final String API_KEY = "test-header-value";
    private static final String MAIL_FROM = "sender@example.test";
    private static final String MAIL_REPLY_TO = "reply@example.test";

    @Test
    void sendsEncodedRawTokenAndOnlyNecessaryMessageContent() throws Exception {
        MockClient client = mockClient();
        String rawToken = "raw+token/with space";
        String hash = "hash-that-must-not-be-sent";
        String email = "teste+" + UUID.randomUUID() + "@exemplo.test";
        CadastroPendente pending = pending(email, hash);
        String expectedLink = "https://connect.example.test/confirmar?token=" +
            URLEncoder.encode(rawToken, StandardCharsets.UTF_8);

        client.server().expect(requestTo(API_URL))
            .andExpect(method(POST))
            .andExpect(header("api-key", API_KEY))
            .andExpect(header("Accept", "application/json"))
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.sender.name").value("InPETU Connect"))
            .andExpect(jsonPath("$.sender.email").value(MAIL_FROM))
            .andExpect(jsonPath("$.replyTo.email").value(MAIL_REPLY_TO))
            .andExpect(jsonPath("$.to[0].email").value(email))
            .andExpect(jsonPath("$.subject").value("Confirme seu cadastro no InPETU Connect"))
            .andExpect(jsonPath("$.textContent", containsString(expectedLink)))
            .andExpect(jsonPath("$.textContent", not(containsString(hash))))
            .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        SmtpEmailSender sender = new SmtpEmailSender(
            client.restClient(), new EmailTemplateRenderer(), true, "https://connect.example.test///",
            API_KEY, MAIL_FROM, MAIL_REPLY_TO);
        sender.sendConfirmation(pending, rawToken);

        client.server().verify();
    }

    @Test
    void sendsOtpAsHtmlAndPlainTextWithoutLeakingNameMarkup() {
        MockClient client = mockClient();
        CadastroPendente pending = pending();
        pending.setNomeCompleto("Ana <script>alert('x')</script> & Cia");
        client.server().expect(requestTo(API_URL))
            .andExpect(method(POST))
            .andExpect(jsonPath("$.subject").value("Seu código InPETU Connect: 482917"))
            .andExpect(jsonPath("$.htmlContent", containsString("Ana &lt;script&gt;")))
            .andExpect(jsonPath("$.htmlContent", not(containsString("<script>"))))
            .andExpect(jsonPath("$.htmlContent", containsString("letter-spacing:10px")))
            .andExpect(jsonPath("$.htmlContent", containsString("Válido por <strong>10 minutos</strong>")))
            .andExpect(jsonPath("$.htmlContent", not(containsString("{{"))))
            .andExpect(jsonPath("$.textContent", containsString("482917")))
            .andExpect(jsonPath("$.textContent", containsString("Válido por 10 minutos")))
            .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        SmtpEmailSender sender = new SmtpEmailSender(
            client.restClient(), new EmailTemplateRenderer(), true, "https://connect.example.test",
            API_KEY, MAIL_FROM, MAIL_REPLY_TO);
        sender.sendConfirmationCode(pending, "482917", 10);

        client.server().verify();
    }

    @Test
    void sendsPasswordResetHtmlAndTextWithExpectedSubject() {
        MockClient client = mockClient();
        client.server().expect(requestTo(API_URL))
            .andExpect(method(POST))
            .andExpect(jsonPath("$.subject").value("Redefinição de senha no InPETU Connect"))
            .andExpect(jsonPath("$.htmlContent", containsString("Código para redefinir a senha")))
            .andExpect(jsonPath("$.htmlContent", containsString("907314")))
            .andExpect(jsonPath("$.textContent", containsString("907314")))
            .andExpect(jsonPath("$.textContent", containsString("Válido por 10 minutos")))
            .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        SmtpEmailSender sender = new SmtpEmailSender(
            client.restClient(), new EmailTemplateRenderer(), true, "https://connect.example.test",
            API_KEY, MAIL_FROM, MAIL_REPLY_TO);
        sender.sendPasswordResetCode("ana@example.test", "Ana Exemplo", "907314", 10);

        client.server().verify();
    }

    @Test
    void refusesToSendWhenPublicUrlIsEmpty() {
        MockClient client = mockClient();
        SmtpEmailSender sender = new SmtpEmailSender(
            client.restClient(), new EmailTemplateRenderer(), true, " ", API_KEY, MAIL_FROM, MAIL_REPLY_TO);
        String rawToken = randomToken();

        IllegalStateException exception = assertThrows(
            IllegalStateException.class, () -> sender.sendConfirmation(pending(), rawToken));

        assertEquals("APP_PUBLIC_URL é obrigatório para enviar confirmações.", exception.getMessage());
        assertFalse(exception.getMessage().contains(rawToken));
        client.server().verify();
    }

    @Test
    void unauthorizedResponseDoesNotLeakResponseBodyOrApiKey(CapturedOutput output) {
        String privateResponseBody = "response-body-must-not-be-logged";
        MockClient client = mockClient();
        client.server().expect(requestTo(API_URL))
            .andExpect(method(POST))
            .andExpect(header("api-key", API_KEY))
            .andExpect(header("Accept", "application/json"))
            .andRespond(withStatus(UNAUTHORIZED).body(privateResponseBody));

        SmtpEmailSender sender = new SmtpEmailSender(
            client.restClient(), new EmailTemplateRenderer(), true, "https://connect.example.test",
            API_KEY, MAIL_FROM, MAIL_REPLY_TO);
        IllegalStateException exception = assertThrows(
            IllegalStateException.class, () -> sender.sendConfirmation(pending(), randomToken()));

        assertEquals("Não foi possível enviar o e-mail.", exception.getMessage());
        assertNotNull(exception.getCause());
        assertFalse(exception.getMessage().contains(API_KEY));
        assertFalse(output.getAll().contains(API_KEY));
        assertFalse(output.getAll().contains(privateResponseBody));
        client.server().verify();
    }

    @Test
    void disabledEmailDoesNotCallApi(CapturedOutput output) {
        MockClient client = mockClient();
        SmtpEmailSender sender = new SmtpEmailSender(
            client.restClient(), new EmailTemplateRenderer(), false, "", "", MAIL_FROM, MAIL_REPLY_TO);

        sender.sendConfirmation(pending(), randomToken());

        assertTrue(output.getAll().contains("MAIL_ENABLED=false"));
        client.server().verify();
    }

    @Test
    void enabledEmailRequiresApiKeyWithoutExposingValue() {
        IllegalStateException exception = assertThrows(IllegalStateException.class, () ->
            new SmtpEmailSender(mockClient().restClient(), new EmailTemplateRenderer(), true,
                "https://connect.example.test", " ", MAIL_FROM, MAIL_REPLY_TO));

        assertEquals("BREVO_API_KEY é obrigatório quando app.mail.enabled=true.", exception.getMessage());
    }

    private static MockClient mockClient() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.brevo.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        return new MockClient(builder.build(), server);
    }

    private record MockClient(RestClient restClient, MockRestServiceServer server) {}

    private static CadastroPendente pending() {
        return pending("teste+" + UUID.randomUUID() + "@exemplo.test", randomToken());
    }

    private static CadastroPendente pending(String email, String tokenHash) {
        CadastroPendente pending = new CadastroPendente();
        pending.setEmail(email);
        pending.setTokenHash(tokenHash);
        pending.setNomeCompleto("Ana Exemplo");
        return pending;
    }

    private static String randomToken() {
        byte[] value = new byte[32];
        new SecureRandom().nextBytes(value);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }
}
