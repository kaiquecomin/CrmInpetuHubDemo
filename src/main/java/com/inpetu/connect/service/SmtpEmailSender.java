package com.inpetu.connect.service;

import com.inpetu.connect.model.CadastroPendente;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.net.URLEncoder;

@Service
@Profile("!test")
public class SmtpEmailSender implements EmailSender {
    private static final Logger logger = LoggerFactory.getLogger(SmtpEmailSender.class);

    private final JavaMailSender mailSender;
    private final boolean mailEnabled;
    private final String appPublicUrl;
    private final String mailFrom;
    private final String mailReplyTo;

    public SmtpEmailSender(JavaMailSender mailSender,
                           @Value("${app.mail.enabled:false}") boolean mailEnabled,
                           @Value("${APP_PUBLIC_URL:}") String appPublicUrl,
                           @Value("${app.mail.from:}") String mailFrom,
                           @Value("${MAIL_REPLY_TO:}") String mailReplyTo) {
        this.mailSender = mailSender;
        this.mailEnabled = mailEnabled;
        this.appPublicUrl = appPublicUrl;
        this.mailFrom = mailFrom;
        this.mailReplyTo = mailReplyTo;
    }

    @Override
    public void sendConfirmation(CadastroPendente pendente, String rawToken) {
        if (!mailEnabled) {
            logger.warn("E-mail de confirmação não enviado para {} porque app.mail.enabled=false.",
                maskedEmail(pendente.getEmail()));
            return;
        }
        if (mailSender == null) {
            throw new IllegalStateException("JavaMailSender não está configurado.");
        }
        if (appPublicUrl == null || appPublicUrl.isBlank()) {
            logger.error("E-mail de confirmação não enviado para {}: APP_PUBLIC_URL está vazio.",
                maskedEmail(pendente.getEmail()));
            throw new IllegalStateException("APP_PUBLIC_URL é obrigatório para enviar confirmações.");
        }

        String publicUrl = appPublicUrl.trim();
        String link = (publicUrl.endsWith("/") ? publicUrl : publicUrl + "/") +
            "confirmar?token=" + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            message.setFrom(new InternetAddress(mailFrom));
            if (mailReplyTo != null && !mailReplyTo.isBlank()) {
                message.setReplyTo(new jakarta.mail.Address[] { new InternetAddress(mailReplyTo) });
            }
            message.setRecipients(MimeMessage.RecipientType.TO, InternetAddress.parse(pendente.getEmail(), false));
            message.setSubject("Confirme seu cadastro no InPETU Connect", StandardCharsets.UTF_8.name());
            String text = "Confirme seu cadastro no InPETU Connect\n\n" +
                "Clique no link abaixo para ativar sua conta:\n" + link + "\n\n" +
                "Este link expira em 20 minutos.\n\n" +
                "Se você não solicitou este cadastro, ignore esta mensagem.";
            message.setText(text, StandardCharsets.UTF_8.name(), "plain");
            mailSender.send(message);
            logger.info("E-mail de confirmação enviado para {}", maskedEmail(pendente.getEmail()));
        } catch (Exception e) {
            logger.error("Falha ao enviar e-mail de confirmação para {} ({}).",
                maskedEmail(pendente.getEmail()), e.getClass().getSimpleName());
            throw new IllegalStateException("Não foi possível enviar o e-mail de confirmação.");
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
