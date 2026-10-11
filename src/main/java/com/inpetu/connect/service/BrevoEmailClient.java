package com.inpetu.connect.service;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.List;

@Service
public class BrevoEmailClient {
    private static final Logger logger = LoggerFactory.getLogger(BrevoEmailClient.class);
    private static final String BREVO_API_URL = "https://api.brevo.com";
    private static final String BREVO_EMAIL_PATH = "/v3/smtp/email";

    private final RestClient restClient;
    private final boolean mailEnabled;
    private final String apiKey;
    private final String mailFrom;
    private final String mailReplyTo;

    @Autowired
    public BrevoEmailClient(RestClient.Builder restClientBuilder,
                            @Value("${app.mail.enabled:false}") boolean mailEnabled,
                            @Value("${BREVO_API_KEY:}") String apiKey,
                            @Value("${MAIL_FROM:}") String mailFrom,
                            @Value("${MAIL_REPLY_TO:}") String mailReplyTo) {
        this(buildRestClient(restClientBuilder, mailEnabled, apiKey), mailEnabled, apiKey, mailFrom, mailReplyTo);
    }

    BrevoEmailClient(RestClient restClient, boolean mailEnabled, String apiKey,
                     String mailFrom, String mailReplyTo) {
        if (mailEnabled && (apiKey == null || apiKey.isBlank())) {
            throw new IllegalStateException("BREVO_API_KEY é obrigatório quando app.mail.enabled=true.");
        }
        if (mailEnabled && (mailFrom == null || mailFrom.isBlank())) {
            throw new IllegalStateException("MAIL_FROM é obrigatório quando app.mail.enabled=true.");
        }
        this.restClient = restClient;
        this.mailEnabled = mailEnabled;
        this.apiKey = apiKey;
        this.mailFrom = mailFrom;
        this.mailReplyTo = mailReplyTo;
    }

    private static RestClient buildRestClient(RestClient.Builder builder, boolean mailEnabled, String apiKey) {
        if (mailEnabled && (apiKey == null || apiKey.isBlank())) {
            throw new IllegalStateException("BREVO_API_KEY é obrigatório quando app.mail.enabled=true.");
        }
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        return builder.baseUrl(BREVO_API_URL).requestFactory(requestFactory).build();
    }

    public boolean send(String email, String subject, EmailTemplateRenderer.EmailContent content, String category) {
        if (!mailEnabled) {
            logger.warn("E-mail de {} não enviado para {} porque MAIL_ENABLED=false.", category, maskedEmail(email));
            return false;
        }

        BrevoEmail request = new BrevoEmail(
            new Sender("InPETU Connect", mailFrom),
            mailReplyTo == null || mailReplyTo.isBlank() ? null : new ReplyTo(mailReplyTo),
            List.of(new Recipient(email)),
            subject,
            content.html(),
            content.text());
        try {
            ResponseEntity<Void> response = restClient.post()
                .uri(BREVO_EMAIL_PATH)
                .header("api-key", apiKey)
                .accept(MediaType.APPLICATION_JSON)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("Brevo retornou HTTP " + response.getStatusCode().value() + ".");
            }
            logger.info("E-mail de {} enviado para {}", category, maskedEmail(email));
            return true;
        } catch (RestClientResponseException e) {
            logger.error("Falha ao enviar e-mail de {} para {} (HTTP {}, causa: {}).",
                category, maskedEmail(email), e.getStatusCode().value(), e.getClass().getSimpleName());
            throw new IllegalStateException("Não foi possível enviar o e-mail.", e);
        } catch (RuntimeException e) {
            logger.error("Falha ao enviar e-mail de {} para {} (causa: {}).",
                category, maskedEmail(email), e.getClass().getSimpleName());
            throw new IllegalStateException("Não foi possível enviar o e-mail.", e);
        }
    }

    public boolean isEnabled() {
        return mailEnabled;
    }

    public void logDisabled(String email, String category) {
        logger.warn("E-mail de {} não enviado para {} porque MAIL_ENABLED=false.", category, maskedEmail(email));
    }

    public String senderAddress() {
        return mailFrom;
    }

    private String maskedEmail(String email) {
        int at = email == null ? -1 : email.indexOf('@');
        if (at <= 0) return "***";
        int dot = email.lastIndexOf('.');
        if (dot <= at) return "***";
        return email.charAt(0) + "***@***." + email.substring(dot + 1);
    }

    private record Sender(String name, String email) {}
    private record ReplyTo(String email) {}
    private record Recipient(String email) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record BrevoEmail(Sender sender, ReplyTo replyTo, List<Recipient> to,
                              String subject, String htmlContent, String textContent) {}
}
