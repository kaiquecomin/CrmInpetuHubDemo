package com.inpetu.connect.service;

import com.inpetu.connect.model.Notificacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.NotificacaoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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
    private final ObjectProvider<JavaMailSender> mailSender;
    private final boolean mailEnabled;
    private final String mailFrom;

    public NotificacaoService(NotificacaoRepository notificacoes, ObjectProvider<JavaMailSender> mailSender,
            @Value("${app.mail.enabled:false}") boolean mailEnabled,
            @Value("${app.mail.from}") String mailFrom) {
        this.notificacoes = notificacoes;
        this.mailSender = mailSender;
        this.mailEnabled = mailEnabled;
        this.mailFrom = mailFrom;
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
        if (!mailEnabled) {
            logger.warn("E-mail de notificação para {} não enviado: app.mail.enabled está desativado.", destinatario.getEmail());
            return "DESATIVADO";
        }
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            logger.error("E-mail de notificação para {} não enviado: JavaMailSender não está configurado.", destinatario.getEmail());
            return "NAO_CONFIGURADO";
        }
        try {
            SimpleMailMessage email = new SimpleMailMessage();
            email.setFrom(mailFrom);
            email.setTo(destinatario.getEmail());
            email.setSubject(titulo);
            email.setText(mensagem);
            sender.send(email);
            return "ENVIADO";
        } catch (MailException erro) {
            logger.error("Falha ao enviar notificação por e-mail para {}.", destinatario.getEmail(), erro);
            return "FALHA";
        }
    }
}
