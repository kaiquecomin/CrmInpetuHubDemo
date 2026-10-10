package com.inpetu.connect.controller;

import com.inpetu.connect.dto.EspacoStatusRequest;
import com.inpetu.connect.model.Espaco;
import com.inpetu.connect.repository.EspacoRepository;
import com.inpetu.connect.repository.ReservaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.io.TempDir;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EspacoControllerTest {
    @Mock EspacoRepository espacos;
    @Mock ReservaRepository reservas;
    EspacoController controller;
    @TempDir Path tempDir;

    @BeforeEach
    void configurarController() {
        controller = new EspacoController(espacos, reservas, tempDir.toString());
    }

    @Test
    void criaEspacoComTipoLivreETextoOpcional() {
        when(espacos.save(any(Espaco.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Espaco criado = controller.criar("  Laboratório Criativo  ", "  Prototipagem rápida  ", 14,
            " Impressora 3D e bancadas ", null);

        assertEquals("Laboratório Criativo", criado.getNomeEspaco());
        assertEquals("Prototipagem rápida", criado.getTipoEspaco());
        assertEquals(14, criado.getCapacidadePessoas());
        assertEquals("Impressora 3D e bancadas", criado.getEquipamentosDisponiveis());
        assertNull(criado.getArquivoImagem());
        verify(espacos).save(criado);
    }

    @Test
    void persisteImagemEnviadaEExponePeloEndpointPublico() throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
        MockMultipartFile imagem = new MockMultipartFile("imagem", "sala.png", "image/png", bytes.toByteArray());
        when(espacos.save(any(Espaco.class))).thenAnswer(invocation -> {
            Espaco salvo = invocation.getArgument(0);
            salvo.setIdEspaco(12);
            return salvo;
        });

        Espaco criado = controller.criar("Sala multiuso", "Encontro e oficina", 20, null, imagem);
        when(espacos.findById(12)).thenReturn(Optional.of(criado));
        var resposta = controller.obterImagem(criado.getIdEspaco());

        assertEquals("image/png", java.util.Objects.requireNonNull(resposta.getHeaders().getContentType()).toString());
        assertTrue(java.util.Objects.requireNonNull(resposta.getBody()).exists());
        assertTrue(criado.getArquivoImagem().endsWith(".png"));
    }

    @Test
    void servesPackagedCatalogImageWithoutAnUploadVolume() throws IOException {
        Espaco espaco = new Espaco();
        espaco.setIdEspaco(91);
        espaco.setArquivoImagem("auditorio.jpg");
        espaco.setTipoImagem("image/jpeg");
        when(espacos.findById(91)).thenReturn(Optional.of(espaco));

        var resposta = controller.obterImagem(91);

        assertEquals("image/jpeg", java.util.Objects.requireNonNull(resposta.getHeaders().getContentType()).toString());
        assertTrue(java.util.Objects.requireNonNull(resposta.getBody()).isReadable());
        try (var content = resposta.getBody().getInputStream()) {
            assertTrue(content.read() >= 0);
        }
    }

    @Test
    void rejeitaImagemComTipoNaoPermitido() {
        MockMultipartFile imagem = new MockMultipartFile("imagem", "sala.gif", "image/gif", new byte[] {1, 2, 3});

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.criar("Sala multiuso", "Oficina", 20, null, imagem));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(espacos, never()).save(any());
    }

    @Test
    void exigeMotivoParaInativarEspaco() {
        Espaco espaco = new Espaco();
        espaco.setAtivo(true);
        when(espacos.findById(1)).thenReturn(Optional.of(espaco));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.status(1, new EspacoStatusRequest(false, "  ", null)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(espacos, never()).save(any());
    }

    @Test
    void guardaMotivoAoInativarEApagaAoReativar() {
        Espaco espaco = new Espaco();
        espaco.setAtivo(true);
        when(espacos.findById(1)).thenReturn(Optional.of(espaco));
        when(espacos.save(espaco)).thenReturn(espaco);

        Espaco indisponivel = controller.status(1, new EspacoStatusRequest(false, "  Manutenção do projetor  ", LocalDate.of(2099, 10, 15)));

        assertFalse(indisponivel.getAtivo());
        assertEquals("Manutenção do projetor", indisponivel.getMotivoIndisponibilidade());
        assertEquals(LocalDate.of(2099, 10, 15), indisponivel.getDataPrevisaoRetorno());

        Espaco reativado = controller.status(1, new EspacoStatusRequest(true, null, null));

        assertTrue(reativado.getAtivo());
        assertNull(reativado.getMotivoIndisponibilidade());
        assertNull(reativado.getDataPrevisaoRetorno());
        verify(espacos, times(2)).save(espaco);
    }

    @Test
    void permiteIndisponibilidadeSemPrazoPrevisto() {
        Espaco espaco = new Espaco();
        espaco.setAtivo(true);
        when(espacos.findById(1)).thenReturn(Optional.of(espaco));
        when(espacos.save(espaco)).thenReturn(espaco);

        Espaco indisponivel = controller.status(1, new EspacoStatusRequest(false, "Manutenção", null));

        assertFalse(indisponivel.getAtivo());
        assertNull(indisponivel.getDataPrevisaoRetorno());
    }
}
