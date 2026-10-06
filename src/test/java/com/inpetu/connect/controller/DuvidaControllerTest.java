package com.inpetu.connect.controller;

import com.inpetu.connect.dto.DuvidaRequest;
import com.inpetu.connect.dto.DuvidaRespostaRequest;
import com.inpetu.connect.model.DuvidaAtendimento;
import com.inpetu.connect.repository.DuvidaAtendimentoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
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
    @SuppressWarnings("unchecked")
    void setUp() {
        duvidas = mock(DuvidaAtendimentoRepository.class);
        ObjectProvider<JavaMailSender> mailSender = mock(ObjectProvider.class);
        controller = new DuvidaController(duvidas, tempDirectory.resolve("uploads").toString(), mailSender, false, "demo@example.test");
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
}