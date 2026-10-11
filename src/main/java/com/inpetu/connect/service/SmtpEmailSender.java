package com.inpetu.connect.service;

import com.inpetu.connect.model.CadastroPendente;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class SmtpEmailSender implements EmailSender {
    private static final Logger logger = LoggerFactory.getLogger(SmtpEmailSender.class);

    private final BrevoEmailClient brevo;
    private final EmailTemplateRenderer templates;
    private final String appPublicUrl;

    @Autowired
    public SmtpEmailSender(BrevoEmailClient brevo, EmailTemplateRenderer templates,
                           @Value("${APP_PUBLIC_URL:}") String appPublicUrl) {
        this.brevo = brevo;
        this.templates = templates;
        this.appPublicUrl = appPublicUrl;
    }

    SmtpEmailSender(RestClient restClient, EmailTemplateRenderer templates, boolean mailEnabled,
                    String appPublicUrl, String apiKey, String mailFrom, String mailReplyTo) {
        this(new BrevoEmailClient(restClient, mailEnabled, apiKey, mailFrom, mailReplyTo), templates, appPublicUrl);
    }

    @Override
    public void sendConfirmation(CadastroPendente pendente, String rawToken) {
        if (!brevo.isEnabled()) {
            brevo.logDisabled(pendente.getEmail(), "confirmação");
            return;
        }
        if (appPublicUrl == null || appPublicUrl.isBlank()) {
            logger.error("Link de confirmação não enviado para {}: APP_PUBLIC_URL está vazio.",
                maskedEmail(pendente.getEmail()));
            throw new IllegalStateException("APP_PUBLIC_URL é obrigatório para enviar confirmações.");
        }
        String publicUrl = appPublicUrl.trim().replaceAll("/+$", "");
        String link = publicUrl + "/confirmar?token=" +
            URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
        String text = "Confirme seu cadastro no InPETU Connect\n\n" +
            "Clique no link abaixo para ativar sua conta:\n" + link + "\n\n" +
            "Este link expira em 20 minutos.\n\n" +
            "Se você não solicitou este cadastro, ignore esta mensagem.";
        brevo.send(pendente.getEmail(), "Confirme seu cadastro no InPETU Connect",
            new EmailTemplateRenderer.EmailContent("", text), "confirmação");
    }

    @Override
    public void sendConfirmationCode(CadastroPendente pendente, String code, int validityMinutes) {
        brevo.send(pendente.getEmail(), "Seu código InPETU Connect: " + code,
            templates.confirmation(pendente.getNomeCompleto(), code, validityMinutes), "confirmação");
    }

    @Override
    public void sendPasswordResetCode(String email, String name, String code, int validityMinutes) {
        brevo.send(email, "Redefinição de senha no InPETU Connect",
            templates.passwordReset(name, code, validityMinutes), "redefinição");
    }

    private String maskedEmail(String email) {
        int at = email == null ? -1 : email.indexOf('@');
        if (at <= 0) return "***";
        int dot = email.lastIndexOf('.');
        if (dot <= at) return "***";
        return email.charAt(0) + "***@***." + email.substring(dot + 1);
    }
}
