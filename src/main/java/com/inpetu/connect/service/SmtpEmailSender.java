package com.inpetu.connect.service;

import com.inpetu.connect.model.CadastroPendente;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

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
                           @Value("${APP_PUBLIC_URL:http://localhost:5173}") String appPublicUrl,
                           @Value("${app.mail.from:nao.respondadev1@gmail.com}") String mailFrom,
                           @Value("${MAIL_REPLY_TO:nao.respondadev1@gmail.com}") String mailReplyTo) {
        this.mailSender = mailSender;
        this.mailEnabled = mailEnabled;
        this.appPublicUrl = appPublicUrl;
        this.mailFrom = mailFrom;
        this.mailReplyTo = mailReplyTo;
    }

    @Override
    public void sendConfirmation(CadastroPendente pendente) {
        if (!mailEnabled) {
            logger.warn("E-mail de confirmação não enviado para {} porque app.mail.enabled=false.", pendente.getEmail());
            return;
        }
        if (mailSender == null) {
            throw new IllegalStateException("JavaMailSender não está configurado.");
        }

        String link = appPublicUrl.endsWith("/")
            ? appPublicUrl + "confirmar-email?token=" + pendente.getTokenHash()
            : appPublicUrl + "/confirmar-email?token=" + pendente.getTokenHash();

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
            logger.info("E-mail de confirmação enviado para {}", pendente.getEmail());
        } catch (Exception e) {
            logger.error("Falha ao enviar e-mail de confirmação para {}.", pendente.getEmail(), e);
            throw new IllegalStateException("Não foi possível enviar o e-mail de confirmação.", e);
        }
    }
}
