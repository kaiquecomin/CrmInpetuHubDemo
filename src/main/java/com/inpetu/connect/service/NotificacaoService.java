package com.inpetu.connect.service;

import com.inpetu.connect.model.Notificacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.NotificacaoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class NotificacaoService {
    private static final Logger logger = LoggerFactory.getLogger(NotificacaoService.class);
    private final NotificacaoRepository notificacoes;
    private final BrevoEmailClient brevo;
    private final EmailTemplateRenderer templates;

    public NotificacaoService(NotificacaoRepository notificacoes, BrevoEmailClient brevo,
                              EmailTemplateRenderer templates) {
        this.notificacoes = notificacoes;
        this.brevo = brevo;
        this.templates = templates;
    }

    @Transactional
    public void enviar(Collection<Usuario> destinatarios, String tipo, String titulo, String mensagem) {
        Map<Integer, Usuario> unicos = new LinkedHashMap<>();
        destinatarios.stream()
                .filter(usuario -> usuario != null && Boolean.TRUE.equals(usuario.getAtivo()))
                .forEach(usuario -> unicos.putIfAbsent(usuario.getIdUsuario(), usuario));

        for (Usuario destinatario : unicos.values()) {
            Notificacao notificacao = new Notificacao();
            notificacao.setIdUsuarioDestinatario(destinatario.getIdUsuario());
            notificacao.setTipo(tipo);
            notificacao.setTitulo(titulo);
            notificacao.setMensagem(mensagem);
            notificacao.setDataHora(LocalDateTime.now());
            notificacao.setStatusEmail(enviarEmail(destinatario, titulo, mensagem));
            notificacoes.save(notificacao);
        }
    }

    private String enviarEmail(Usuario destinatario, String titulo, String mensagem) {
        if (!brevo.isEnabled()) {
            brevo.logDisabled(destinatario.getEmail(), "notificação");
            return "DESATIVADO";
        }
        try {
            return brevo.send(destinatario.getEmail(), titulo,
                templates.notification(destinatario.getNomeCompleto(), titulo, mensagem), "notificação")
                ? "ENVIADO" : "DESATIVADO";
        } catch (IllegalStateException erro) {
            logger.warn("Notificação registrada sem envio de e-mail após falha do provedor.");
            return "FALHA";
        }
    }
}
