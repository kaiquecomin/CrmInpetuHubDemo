package com.inpetu.connect.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Year;

@Component
public class EmailTemplateRenderer {
    public EmailContent confirmation(String name, String code, int validityMinutes) {
        return render("confirmacao", name, code, validityMinutes);
    }

    public EmailContent passwordReset(String name, String code, int validityMinutes) {
        return render("esqueci-senha", name, code, validityMinutes);
    }

    public EmailContent doubtResponse(String response) {
        return renderMessage("resposta-duvida", "", "Resposta da equipe InPETU Hub", response);
    }

    public EmailContent notification(String name, String title, String message) {
        return renderMessage("notificacao", name, title, message);
    }

    private EmailContent render(String templateName, String name, String code, int validityMinutes) {
        if (code == null || !code.matches("\\d{6}")) {
            throw new IllegalArgumentException("O código do e-mail deve conter seis dígitos.");
        }
        String safeName = name == null ? "" : name;
        String plainName = safeName.replaceAll("[\\r\\n]+", " ").trim();
        int year = Year.now().getValue();
        return new EmailContent(
            apply(readTemplate(templateName + ".html"), escapeHtml(safeName), code, validityMinutes, year),
            apply(readTemplate(templateName + ".txt"), plainName, code, validityMinutes, year));
    }

    private String readTemplate(String fileName) {
        try {
            try (var input = new ClassPathResource("templates/email/" + fileName).getInputStream()) {
                return new String(input.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Não foi possível carregar o modelo de e-mail " + fileName + ".", e);
        }
    }

    private String apply(String template, String name, String code, int validityMinutes, int year) {
        return template
            .replace("{{NOME}}", name)
            .replace("{{CODIGO}}", code)
            .replace("{{VALIDADE_MIN}}", Integer.toString(validityMinutes))
            .replace("{{ANO}}", Integer.toString(year));
    }

    private EmailContent renderMessage(String templateName, String name, String title, String message) {
        String safeName = name == null ? "" : name;
        String safeTitle = title == null ? "" : title;
        String safeMessage = message == null ? "" : message;
        String plainName = plainText(safeName);
        String plainTitle = plainText(safeTitle);
        String plainMessage = plainText(safeMessage);
        int year = Year.now().getValue();
        return new EmailContent(
            readTemplate(templateName + ".html")
                .replace("{{NOME}}", escapeHtml(safeName))
                .replace("{{TITULO}}", escapeHtml(safeTitle))
                .replace("{{MENSAGEM}}", escapeHtml(safeMessage).replace("\r\n", "\n").replace("\n", "<br>"))
                .replace("{{ANO}}", Integer.toString(year)),
            readTemplate(templateName + ".txt")
                .replace("{{NOME}}", plainName)
                .replace("{{TITULO}}", plainTitle)
                .replace("{{MENSAGEM}}", plainMessage)
                .replace("{{ANO}}", Integer.toString(year)));
    }

    private String escapeHtml(String value) {
        return value.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }

    private String plainText(String value) {
        return value.replaceAll("[\\r\\n]+", " ").trim();
    }

    public record EmailContent(String html, String text) {}
}
