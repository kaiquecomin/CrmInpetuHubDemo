package com.inpetu.connect.controller;

import com.inpetu.connect.dto.EspacoStatusRequest;
import com.inpetu.connect.model.Espaco;
import com.inpetu.connect.model.EspacoFoto;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.EspacoRepository;
import com.inpetu.connect.repository.EspacoFotoRepository;
import com.inpetu.connect.repository.LogAuditoriaRepository;
import com.inpetu.connect.repository.ReservaRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
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
    @Mock EspacoFotoRepository fotos;
    @Mock LogAuditoriaRepository auditoria;
    @Mock UsuarioRepository usuarios;
    @Mock Authentication authentication;
    EspacoController controller;
    @TempDir Path tempDir;

    @BeforeEach
    void configurarController() {
        controller = new EspacoController(espacos, reservas, fotos, auditoria, usuarios, tempDir.toString());
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
    void rejectsLegacyCatalogImageReferenceThatIsNoLongerPackagedAtTheRoot() {
        Espaco espaco = new Espaco();
        espaco.setIdEspaco(91);
        espaco.setArquivoImagem("auditorio.jpg");
        espaco.setTipoImagem("image/jpeg");
        when(espacos.findById(91)).thenReturn(Optional.of(espaco));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.obterImagem(91));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
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
    void atualizaDadosDoEspacoERegistraAuditoria() {
        Espaco existente = new Espaco();
        existente.setIdEspaco(17);
        existente.setNomeEspaco("Sala antiga");
        when(espacos.findById(17)).thenReturn(Optional.of(existente));
        when(espacos.save(existente)).thenReturn(existente);
        when(authentication.getName()).thenReturn("coordenador@inpetu.test");
        Usuario usuario = new Usuario();
        usuario.setIdUsuario(3);
        when(usuarios.findByEmail("coordenador@inpetu.test")).thenReturn(Optional.of(usuario));

        Espaco atualizado = controller.atualizar(17, "Sala atualizada", "Reunião", 12,
            "Tela e quadro", "Ambiente para equipes", true, null, authentication);

        assertEquals("Sala atualizada", atualizado.getNomeEspaco());
        assertEquals("Reunião", atualizado.getTipoEspaco());
        assertEquals(12, atualizado.getCapacidadePessoas());
        assertEquals("Tela e quadro", atualizado.getEquipamentosDisponiveis());
        assertEquals("Ambiente para equipes", atualizado.getDescricao());
        assertTrue(atualizado.getExigeAprovacaoManual());
        verify(auditoria).save(argThat(log -> "EDICAO_ESPACO".equals(log.getAcao())
            && Integer.valueOf(17).equals(log.getIdRegistroAfetado())));
    }

    @Test
    void rejeitaArquivoComAssinaturaInvalidaAoAdicionarFoto() {
        when(espacos.findById(17)).thenReturn(Optional.of(new Espaco()));
        MockMultipartFile imagem = new MockMultipartFile("imagem", "foto.png", "image/png", new byte[] {1, 2, 3});

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.adicionarFoto(17, imagem, null, authentication));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(fotos, never()).save(any(EspacoFoto.class));
    }

    @Test
    void adicionaFotoValidaEExponeImagemDaGaleria() throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
        MockMultipartFile imagem = new MockMultipartFile("imagem", "sala.png", "image/png", bytes.toByteArray());
        Espaco espaco = new Espaco();
        espaco.setIdEspaco(17);
        espaco.setNomeEspaco("Sala de teste");
        when(espacos.findById(17)).thenReturn(Optional.of(espaco));
        when(fotos.findAllByIdEspacoOrderByOrdemAscIdEspacoFotoAsc(17)).thenReturn(java.util.List.of());
        when(fotos.save(any(EspacoFoto.class))).thenAnswer(invocation -> {
            EspacoFoto salvo = invocation.getArgument(0);
            salvo.setIdEspacoFoto(8);
            return salvo;
        });
        when(espacos.save(espaco)).thenReturn(espaco);
        when(authentication.getName()).thenReturn("coordenador@inpetu.test");
        Usuario usuario = new Usuario();
        usuario.setIdUsuario(3);
        when(usuarios.findByEmail("coordenador@inpetu.test")).thenReturn(Optional.of(usuario));

        EspacoFoto foto = controller.adicionarFoto(17, imagem, "Sala de oficinas", authentication);
        when(fotos.findByIdEspacoAndIdEspacoFoto(17, 8)).thenReturn(Optional.of(foto));
        var response = controller.obterFoto(17, 8);

        assertEquals("Sala de oficinas", foto.getLegenda());
        assertEquals(0, foto.getOrdem());
        assertEquals(foto.getArquivo(), espaco.getArquivoImagem());
        assertEquals("image/png", java.util.Objects.requireNonNull(response.getHeaders().getContentType()).toString());
        assertTrue(java.util.Objects.requireNonNull(response.getBody()).exists());
    }

    @Test
    void retorna404QuandoFotoNaoPertenceAoEspaco() {
        when(espacos.findById(17)).thenReturn(Optional.of(new Espaco()));
        when(fotos.findByIdEspacoAndIdEspacoFoto(17, 4)).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.obterFoto(17, 4));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
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
