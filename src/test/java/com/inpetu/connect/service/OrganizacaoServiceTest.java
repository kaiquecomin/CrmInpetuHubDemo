package com.inpetu.connect.service;

import com.inpetu.connect.model.LogAuditoria;
import com.inpetu.connect.model.Organizacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.LogAuditoriaRepository;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrganizacaoServiceTest {
    @Mock OrganizacaoRepository organizacoes;
    @Mock UsuarioRepository usuarios;
    @Mock LogAuditoriaRepository auditoria;
    @InjectMocks OrganizacaoService service;

    @Test
    void descredenciamentoDesativaOrganizacaoSolicitantesERegistraMotivo() {
        Organizacao organizacao = new Organizacao();
        organizacao.setIdOrganizacao(7);
        organizacao.setAtivo(true);
        Usuario coordenador = new Usuario();
        coordenador.setIdUsuario(1);
        Usuario solicitante = new Usuario();
        solicitante.setIdUsuario(9);
        solicitante.setIdPerfil(4);
        solicitante.setAtivo(true);
        when(usuarios.findByEmail("coord@example.org")).thenReturn(Optional.of(coordenador));
        when(organizacoes.findById(7)).thenReturn(Optional.of(organizacao));
        when(organizacoes.save(organizacao)).thenReturn(organizacao);
        when(usuarios.findAllByIdOrganizacaoAndIdPerfilAndAtivoTrue(7, 4)).thenReturn(List.of(solicitante));

        Organizacao result = service.descredenciar(7, "  Cadastro duplicado  ", "coord@example.org");

        assertSame(organizacao, result);
        assertFalse(organizacao.getAtivo());
        assertEquals("Cadastro duplicado", organizacao.getMotivoDescredenciamento());
        assertFalse(solicitante.getAtivo());
        verify(usuarios).saveAll(List.of(solicitante));
        ArgumentCaptor<LogAuditoria> log = ArgumentCaptor.forClass(LogAuditoria.class);
        verify(auditoria).save(log.capture());
        assertEquals("DESCREDENCIAMENTO", log.getValue().getAcao());
        assertEquals("Cadastro duplicado | Acessos públicos desativados: 1", log.getValue().getDetalhesAlteracao());
        assertEquals(1, log.getValue().getIdUsuarioResponsavel());
    }

    @Test
    void descredenciamentoExigeMotivoAntesDeAlterarDados() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> service.descredenciar(7, "  ", "coord@example.org"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(organizacoes, usuarios, auditoria);
    }
}
