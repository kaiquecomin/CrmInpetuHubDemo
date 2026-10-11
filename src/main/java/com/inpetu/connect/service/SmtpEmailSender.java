package com.inpetu.connect.service;

import com.inpetu.connect.model.CadastroPendente;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

@Service
@Profile("!test")
public class SmtpEmailSender implements EmailSender {
    private static final Logger logger = LoggerFactory.getLogger(SmtpEmailSender.class);
    private static final String BREVO_API_URL = "https://api.brevo.com";
    private static final String BREVO_EMAIL_PATH = "/v3/smtp/email";

    private final RestClient restClient;
    private final boolean mailEnabled;
    private final String appPublicUrl;
    private final String apiKey;
    private final String mailFrom;
    private final String mailReplyTo;

    public SmtpEmailSender(RestClient.Builder restClientBuilder,
                           @Value("${app.mail.enabled:false}") boolean mailEnabled,
                           @Value("${APP_PUBLIC_URL:}") String appPublicUrl,
                           @Value("${BREVO_API_KEY:}") String apiKey,
                           @Value("${MAIL_FROM:}") String mailFrom,
                           @Value("${MAIL_REPLY_TO:}") String mailReplyTo) {
        this(buildRestClient(restClientBuilder, mailEnabled, apiKey), mailEnabled, appPublicUrl,
            apiKey, mailFrom, mailReplyTo);
    }

    SmtpEmailSender(RestClient restClient, boolean mailEnabled, String appPublicUrl,
                    String apiKey, String mailFrom, String mailReplyTo) {
        if (mailEnabled && (apiKey == null || apiKey.isBlank())) {
            throw new IllegalStateException("BREVO_API_KEY é obrigatório quando app.mail.enabled=true.");
        }
        this.restClient = restClient;
        this.mailEnabled = mailEnabled;
        this.appPublicUrl = appPublicUrl;
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
        return builder
            .baseUrl(BREVO_API_URL)
            .requestFactory(requestFactory)
            .build();
    }

    @Override
    public void sendConfirmation(CadastroPendente pendente, String rawToken) {
        if (!mailEnabled) {
            logger.warn("E-mail de confirmação não enviado para {} porque app.mail.enabled=false.",
                maskedEmail(pendente.getEmail()));
            return;
        }
        if (appPublicUrl == null || appPublicUrl.isBlank()) {
            logger.error("E-mail de confirmação não enviado para {}: APP_PUBLIC_URL está vazio.",
                maskedEmail(pendente.getEmail()));
            throw new IllegalStateException("APP_PUBLIC_URL é obrigatório para enviar confirmações.");
        }

        String publicUrl = appPublicUrl.trim();
        String link = (publicUrl.endsWith("/") ? publicUrl : publicUrl + "/") +
            "confirmar?token=" + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);

        String text = "Confirme seu cadastro no InPETU Connect\n\n" +
            "Clique no link abaixo para ativar sua conta:\n" + link + "\n\n" +
            "Este link expira em 20 minutos.\n\n" +
            "Se você não solicitou este cadastro, ignore esta mensagem.";
        BrevoEmail request = new BrevoEmail(
            new Sender("InPETU Connect", mailFrom),
            new ReplyTo(mailReplyTo),
            List.of(new Recipient(pendente.getEmail())),
            "Confirme seu cadastro no InPETU Connect",
            text);

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
                throw new UnexpectedHttpStatusException(response.getStatusCode().value());
            }
            logger.info("E-mail de confirmação enviado para {}", maskedEmail(pendente.getEmail()));
        } catch (RestClientResponseException e) {
            logger.error("Falha ao enviar e-mail de confirmação para {} (HTTP {}, causa: {}).",
                maskedEmail(pendente.getEmail()), e.getStatusCode().value(), e.getClass().getSimpleName());
            throw new IllegalStateException("Não foi possível enviar o e-mail de confirmação.");
        } catch (UnexpectedHttpStatusException e) {
            logger.error("Falha ao enviar e-mail de confirmação para {} (HTTP {}, causa: {}).",
                maskedEmail(pendente.getEmail()), e.status, e.getClass().getSimpleName());
            throw new IllegalStateException("Não foi possível enviar o e-mail de confirmação.");
        } catch (Exception e) {
            logger.error("Falha ao enviar e-mail de confirmação para {} (HTTP indisponível, causa: {}).",
                maskedEmail(pendente.getEmail()), e.getClass().getSimpleName());
            throw new IllegalStateException("Não foi possível enviar o e-mail de confirmação.");
        }
    }

    private record Sender(String name, String email) {}

    private record ReplyTo(String email) {}

    private record Recipient(String email) {}

    private record BrevoEmail(Sender sender, ReplyTo replyTo, List<Recipient> to,
                              String subject, String textContent) {}

    private static final class UnexpectedHttpStatusException extends RuntimeException {
        private final int status;

        private UnexpectedHttpStatusException(int status) {
            this.status = status;
        }
    }

    private String maskedEmail(String email) {
        int at = email == null ? -1 : email.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        int dot = email.lastIndexOf('.');
        if (dot <= at) {
            return "***";
        }
        return email.charAt(0) + "***@***." + email.substring(dot + 1);
    }
}
