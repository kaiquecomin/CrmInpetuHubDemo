package com.inpetu.connect.service;

import com.inpetu.connect.model.Notificacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.NotificacaoRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificacaoServiceTest {
    @Test
    void sendsNotificationWithSharedHtmlAndTextTemplate() {
        NotificacaoRepository repository = mock(NotificacaoRepository.class);
        BrevoEmailClient brevo = mock(BrevoEmailClient.class);
        when(brevo.isEnabled()).thenReturn(true);
        when(brevo.send(eq("ana@example.test"), eq("Reserva aprovada"), any(), eq("notificação")))
            .thenReturn(true);
        when(repository.save(any(Notificacao.class))).thenAnswer(invocation -> invocation.getArgument(0));
        NotificacaoService service = new NotificacaoService(repository, brevo, new EmailTemplateRenderer());
        Usuario destinatario = new Usuario();
        destinatario.setIdUsuario(42);
        destinatario.setNomeCompleto("Ana <Souza>");
        destinatario.setEmail("ana@example.test");
        destinatario.setAtivo(true);

        service.enviar(List.of(destinatario), "RESERVA", "Reserva aprovada", "Sua reserva foi confirmada.");

        var content = org.mockito.ArgumentCaptor.forClass(EmailTemplateRenderer.EmailContent.class);
        verify(brevo).send(eq("ana@example.test"), eq("Reserva aprovada"), content.capture(), eq("notificação"));
        var notification = org.mockito.ArgumentCaptor.forClass(Notificacao.class);
        verify(repository).save(notification.capture());
        assertEquals("ENVIADO", notification.getValue().getStatusEmail());
        assertFalse(content.getValue().html().contains("{{"));
        assertEquals(true, content.getValue().html().contains("Ana &lt;Souza&gt;"));
        assertEquals(true, content.getValue().text().contains("Sua reserva foi confirmada."));
    }
}
