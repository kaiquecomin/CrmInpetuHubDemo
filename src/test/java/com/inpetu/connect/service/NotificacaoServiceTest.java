package com.inpetu.connect.service;

import com.inpetu.connect.model.Notificacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.NotificacaoRepository;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
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

    @Test
    void safelyTruncatesLongTitlesAndMessagesAcrossNotificationFlows() {
        NotificacaoRepository repository = mock(NotificacaoRepository.class);
        BrevoEmailClient brevo = mock(BrevoEmailClient.class);
        when(repository.save(any(Notificacao.class))).thenAnswer(invocation -> invocation.getArgument(0));
        NotificacaoService service = new NotificacaoService(repository, brevo, new EmailTemplateRenderer());
        Usuario destinatario = new Usuario();
        destinatario.setIdUsuario(42);
        destinatario.setEmail("ana@example.test");
        destinatario.setAtivo(true);
        String titulo = "🔔".repeat(300);
        String mensagem = "Conteúdo detalhado. ".repeat(40);
        var saved = org.mockito.ArgumentCaptor.forClass(Notificacao.class);

        for (String tipo : List.of("RESERVA", "DUVIDA", "CADASTRO", "TICKET")) {
            service.enviar(List.of(destinatario), tipo, titulo, mensagem);
        }

        verify(repository, org.mockito.Mockito.times(4)).save(saved.capture());
        assertEquals(List.of("RESERVA", "DUVIDA", "CADASTRO", "TICKET"),
            saved.getAllValues().stream().map(Notificacao::getTipo).toList());
        for (Notificacao notification : saved.getAllValues()) {
            assertEquals(150, notification.getTitulo().codePointCount(0, notification.getTitulo().length()));
            assertEquals(500, notification.getMensagem().codePointCount(0, notification.getMensagem().length()));
            assertTrue(notification.getTitulo().endsWith("…"));
            assertTrue(notification.getMensagem().endsWith("…"));
            assertTrue(Character.isLowSurrogate(notification.getTitulo()
                .charAt(notification.getTitulo().length() - 2)));
        }
    }

    @Test
    void storesFiveHundredAccentedCharactersWithoutBreakingUnicode() {
        NotificacaoRepository repository = mock(NotificacaoRepository.class);
        BrevoEmailClient brevo = mock(BrevoEmailClient.class);
        when(repository.save(any(Notificacao.class))).thenAnswer(invocation -> invocation.getArgument(0));
        NotificacaoService service = new NotificacaoService(repository, brevo, new EmailTemplateRenderer());
        Usuario destinatario = new Usuario();
        destinatario.setIdUsuario(42);
        destinatario.setEmail("ana@example.test");
        destinatario.setAtivo(true);
        var saved = org.mockito.ArgumentCaptor.forClass(Notificacao.class);

        service.enviar(List.of(destinatario), "TICKET", "Atualização", "á".repeat(500));

        verify(repository).save(saved.capture());
        String stored = saved.getValue().getMensagem();
        assertEquals(500, stored.codePointCount(0, stored.length()));
        assertEquals(1000, stored.getBytes(StandardCharsets.UTF_8).length);
        assertEquals("á".repeat(500), stored);
    }
}
