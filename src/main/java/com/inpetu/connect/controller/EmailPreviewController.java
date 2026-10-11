package com.inpetu.connect.controller;

import com.inpetu.connect.service.EmailTemplateRenderer;
import com.inpetu.connect.service.CadastroPublicoService;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.MediaType;

@RestController
@RequestMapping("/api/v1/dev/email-preview")
@Profile("dev")
public class EmailPreviewController {
    private final EmailTemplateRenderer renderer;

    public EmailPreviewController(EmailTemplateRenderer renderer) {
        this.renderer = renderer;
    }

    @GetMapping(produces = MediaType.TEXT_HTML_VALUE)
    public String preview() {
        var confirmation = renderer.confirmation(
            "Ana Exemplo", "482917", CadastroPublicoService.CODIGO_VALIDADE_MINUTOS);
        var passwordReset = renderer.passwordReset(
            "Ana Exemplo", "482917", CadastroPublicoService.CODIGO_VALIDADE_MINUTOS);
        return """
            <!doctype html>
            <html lang="pt-BR">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Prévia de e-mails InPETU Connect</title>
            </head>
            <body style="margin:0;padding:24px;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#14233f">
              <main style="max-width:680px;margin:0 auto">
                <h1>Prévia dos e-mails InPETU Connect</h1>
                <p>Conteúdo fictício para conferência local. Nenhum e-mail foi enviado.</p>
                <h2>Confirmação de cadastro</h2>
                <iframe title="E-mail de confirmação" sandbox="" style="width:100%%;height:850px;border:1px solid #ccd5df;background:#fff"
                  srcdoc="%s"></iframe>
                <h2>Redefinição de senha</h2>
                <iframe title="E-mail de redefinição de senha" sandbox="" style="width:100%%;height:850px;border:1px solid #ccd5df;background:#fff"
                  srcdoc="%s"></iframe>
              </main>
            </body>
            </html>
            """.formatted(escapeAttribute(confirmation.html()), escapeAttribute(passwordReset.html()));
    }

    private String escapeAttribute(String html) {
        return html.replace("&", "&amp;")
            .replace("\"", "&quot;")
            .replace("<", "&lt;")
            .replace(">", "&gt;");
    }
}
