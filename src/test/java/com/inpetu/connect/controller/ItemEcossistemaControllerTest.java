package com.inpetu.connect.controller;

import com.inpetu.connect.model.ItemEcossistema;
import com.inpetu.connect.repository.ItemEcossistemaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ItemEcossistemaControllerTest {
    @TempDir Path tempDirectory;
    @Mock ItemEcossistemaRepository itens;
    ItemEcossistemaController controller;

    @BeforeEach
    void setUp() {
        controller = new ItemEcossistemaController(itens, tempDirectory.resolve("uploads").toString());
    }

    @Test
    void retornaSomenteItensPublicadosEmOrdem() {
        ItemEcossistema item = new ItemEcossistema();
        when(itens.findAllByAtivoTrueOrderByOrdemAscIdItemEcossistemaAsc()).thenReturn(List.of(item));

        assertEquals(List.of(item), controller.listarPublicos());
    }

    @Test
    void criaItemComLogoValidado() throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", bytes);
        MockMultipartFile logo = new MockMultipartFile("logo", "marca.png", "image/png", bytes.toByteArray());
        when(itens.save(any(ItemEcossistema.class))).thenAnswer(invocation -> {
            ItemEcossistema item = invocation.getArgument(0);
            item.setIdItemEcossistema(8);
            return item;
        });

        ItemEcossistema salvo = controller.criar(" UFSC ", " Parceiro do ecossistema ", "Parceiro", null, 0, true, logo);

        assertEquals("UFSC", salvo.getNome());
        assertEquals("Parceiro do ecossistema", salvo.getDescricao());
        assertEquals("Parceiro", salvo.getCategoria());
        assertEquals("image/png", salvo.getTipoLogo());
        assertTrue(Files.isRegularFile(tempDirectory.resolve("uploads/ecossistema").resolve(salvo.getArquivoLogo())));
    }

    @Test
    void rejeitaFormatoDeLogoNaoSuportado() {
        MockMultipartFile logo = new MockMultipartFile("logo", "marca.svg", "image/svg+xml", "<svg/>".getBytes());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.criar("UFSC", "Parceiro", "Parceiro", null, 0, true, logo));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(itens, never()).save(any());
    }

    @Test
    void exigeNomeEDescricao() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.criar(" ", "Parceiro", "Parceiro", null, 0, true, null));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(itens);
    }

    @Test
    void rejeitaArquivoCujoConteudoNaoCorrespondeAoTipo() {
        MockMultipartFile logo = new MockMultipartFile("logo", "marca.png", "image/png", "não é png".getBytes());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.criar("UFSC", "Parceiro", "Parceiro", null, 0, true, logo));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(itens, never()).save(any());
    }

    @Test
    void retornaNotFoundQuandoItemNaoExiste() {
        when(itens.findById(99)).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.obterLogo(99));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
    }

    @Test
    void criaIniciativaComLinkHttps() {
        when(itens.save(any(ItemEcossistema.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ItemEcossistema salvo = controller.criar("Projeto", "Descrição do projeto", "Iniciativa",
            "https://inpetuhub.sites.ufsc.br/projeto/", 0, true, null);

        assertEquals("Iniciativa", salvo.getCategoria());
        assertEquals("https://inpetuhub.sites.ufsc.br/projeto/", salvo.getUrlDestino());
    }

    @Test
    void rejeitaCategoriaOuLinkInvalido() {
        assertThrows(ResponseStatusException.class,
            () -> controller.criar("Projeto", "Descrição", "Outra", null, 0, true, null));
        assertThrows(ResponseStatusException.class,
            () -> controller.criar("Projeto", "Descrição", "Iniciativa", "javascript:alert(1)", 0, true, null));

        verify(itens, never()).save(any());
    }
}
