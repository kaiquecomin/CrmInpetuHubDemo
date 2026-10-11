package com.inpetu.connect.controller;

import com.inpetu.connect.dto.DuvidaRequest;
import com.inpetu.connect.dto.DuvidaRespostaRequest;
import com.inpetu.connect.model.DuvidaAtendimento;
import com.inpetu.connect.repository.DuvidaAtendimentoRepository;
import com.inpetu.connect.service.BrevoEmailClient;
import com.inpetu.connect.service.EmailTemplateRenderer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DuvidaControllerTest {
    @TempDir Path tempDirectory;
    DuvidaAtendimentoRepository duvidas;
    DuvidaController controller;

    @BeforeEach
    void setUp() {
        duvidas = mock(DuvidaAtendimentoRepository.class);
        BrevoEmailClient brevo = mock(BrevoEmailClient.class);
        when(brevo.isEnabled()).thenReturn(false);
        controller = new DuvidaController(duvidas, tempDirectory.resolve("uploads").toString(),
            brevo, new EmailTemplateRenderer());
    }

    @Test
    void salvaSolicitacaoSemAnexo() {
        when(duvidas.save(any(DuvidaAtendimento.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DuvidaAtendimento salvo = controller.criar(new DuvidaRequest("ana@example.test", null, "Preciso de ajuda."));

        assertEquals("ana@example.test", salvo.getEmailContato());
        assertEquals("Preciso de ajuda.", salvo.getMensagemDuvida());
        assertNull(salvo.getCaminhoAnexo());
    }

    @Test
    void salvaPdfAssinadoEFechaFluxoDoAnexo() throws Exception {
        when(duvidas.save(any(DuvidaAtendimento.class))).thenAnswer(invocation -> invocation.getArgument(0));
        MockMultipartFile anexo = new MockMultipartFile("anexo", "arquivo.pdf", "application/pdf",
            "%PDF-1.7\nconteudo de teste".getBytes(StandardCharsets.US_ASCII));

        DuvidaAtendimento salvo = controller.criarComAnexo(
            new DuvidaRequest("ana@example.test", null, "Veja o documento anexado."), anexo);

        assertTrue(salvo.getCaminhoAnexo().endsWith(".pdf"));
        assertTrue(Files.isRegularFile(tempDirectory.resolve("uploads").resolve(salvo.getCaminhoAnexo())));
    }

    @Test
    void rejeitaMimeQueNaoCorrespondeAoConteudo() {
        MockMultipartFile anexo = new MockMultipartFile("anexo", "arquivo.pdf", "application/pdf", "conteudo falso".getBytes());

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
            controller.criarComAnexo(new DuvidaRequest("ana@example.test", null, "Mensagem."), anexo));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(duvidas, never()).save(any(DuvidaAtendimento.class));
    }

    @Test
    void removeArquivoQuandoPersistenciaFalha() throws Exception {
        when(duvidas.save(any(DuvidaAtendimento.class))).thenThrow(new IllegalStateException("Falha simulada de banco"));
        MockMultipartFile anexo = new MockMultipartFile("anexo", "arquivo.pdf", "application/pdf",
            "%PDF-1.7\nconteudo de teste".getBytes(StandardCharsets.US_ASCII));

        assertThrows(IllegalStateException.class, () ->
            controller.criarComAnexo(new DuvidaRequest("ana@example.test", null, "Mensagem."), anexo));

        try (var arquivos = Files.list(tempDirectory.resolve("uploads"))) {
            assertEquals(0, arquivos.count());
        }
    }

    @Test
    void retornaNotFoundParaSolicitacaoOuAnexoInexistente() {
        when(duvidas.findById(999)).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> controller.baixarAnexo(999));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
    }

    @Test
    void respondeChamadoExistenteEAtualizaStatus() {
        DuvidaAtendimento chamado = new DuvidaAtendimento();
        chamado.setIdDuvida(7);
        chamado.setEmailContato("ana@example.test");
        when(duvidas.findById(7)).thenReturn(Optional.of(chamado));
        when(duvidas.save(chamado)).thenReturn(chamado);

        DuvidaAtendimento salvo = controller.responder(7, new DuvidaRespostaRequest(" Resposta da equipe "));

        assertEquals("Resposta da equipe", salvo.getRespostaEquipe());
        assertEquals("Respondida", salvo.getStatusAtendimento());
        assertNotNull(salvo.getDataResposta());
    }

    @Test
    void sendsSavedDoubtResponseUsingHtmlAndTextTemplate() {
        DuvidaAtendimento chamado = new DuvidaAtendimento();
        chamado.setIdDuvida(8);
        chamado.setEmailContato("ana@example.test");
        BrevoEmailClient brevo = mock(BrevoEmailClient.class);
        when(brevo.isEnabled()).thenReturn(true);
        DuvidaController emailController = new DuvidaController(duvidas, tempDirectory.resolve("uploads").toString(),
            brevo, new EmailTemplateRenderer());
        when(duvidas.findById(8)).thenReturn(Optional.of(chamado));
        when(duvidas.save(chamado)).thenReturn(chamado);

        emailController.responder(8, new DuvidaRespostaRequest("<script>alert('x')</script>"));

        var content = org.mockito.ArgumentCaptor.forClass(com.inpetu.connect.service.EmailTemplateRenderer.EmailContent.class);
        verify(brevo).send(org.mockito.ArgumentMatchers.eq("ana@example.test"),
            org.mockito.ArgumentMatchers.eq("Resposta da equipe InPETU Hub"), content.capture(),
            org.mockito.ArgumentMatchers.eq("resposta de dúvida"));
        assertTrue(content.getValue().html().contains("&lt;script&gt;"));
        assertFalse(content.getValue().html().contains("<script>"));
        assertTrue(content.getValue().text().contains("<script>"));
    }
}