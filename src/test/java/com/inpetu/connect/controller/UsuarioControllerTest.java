package com.inpetu.connect.controller;

import com.inpetu.connect.dto.MotivoExclusaoCadastroRequest;
import com.inpetu.connect.dto.CadastroPublicoRequest;
import com.inpetu.connect.dto.UsuarioResumo;
import com.inpetu.connect.model.LogAuditoria;
import com.inpetu.connect.model.Organizacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.LogAuditoriaRepository;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioControllerTest {
    @Mock UsuarioRepository usuarios;
    @Mock LogAuditoriaRepository auditoria;
    @Mock OrganizacaoRepository organizacoes;
    @Mock PasswordEncoder passwordEncoder;
    @Mock Authentication authentication;
    @InjectMocks UsuarioController controller;

    @Test
    void excluiCadastroPublicoComMotivoERegistraAuditoria() {
        Usuario solicitante = new Usuario();
        solicitante.setIdUsuario(9);
        solicitante.setIdPerfil(4);
        solicitante.setAtivo(true);
        Usuario coordenador = new Usuario();
        coordenador.setIdUsuario(1);
        when(usuarios.findById(9)).thenReturn(Optional.of(solicitante));
        when(authentication.getName()).thenReturn("coord@example.org");
        when(usuarios.findByEmail("coord@example.org")).thenReturn(Optional.of(coordenador));
        when(usuarios.save(solicitante)).thenReturn(solicitante);

        var result = controller.excluirCadastro(9,
            new MotivoExclusaoCadastroRequest("  Cadastro duplicado  "), authentication);

        assertFalse(result.ativo());
        assertFalse(solicitante.getAtivo());
        ArgumentCaptor<LogAuditoria> log = ArgumentCaptor.forClass(LogAuditoria.class);
        verify(auditoria).save(log.capture());
        assertEquals("EXCLUSAO_CADASTRO", log.getValue().getAcao());
        assertEquals("Cadastro duplicado", log.getValue().getDetalhesAlteracao());
        assertEquals(9, log.getValue().getIdRegistroAfetado());
        assertEquals(1, log.getValue().getIdUsuarioResponsavel());
    }

    @Test
    void naoPermiteExcluirContaInternaComoCadastroPublico() {
        Usuario staff = new Usuario();
        staff.setIdPerfil(3);
        staff.setAtivo(true);
        when(usuarios.findById(9)).thenReturn(Optional.of(staff));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.excluirCadastro(9,
                new MotivoExclusaoCadastroRequest("Solicitação inválida"), authentication));

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(usuarios, never()).save(any());
        verifyNoInteractions(auditoria);
    }

    @Test
    void naoPermiteCoordenadorAlterarProprioPerfil() {
        Usuario coordenador = new Usuario();
        coordenador.setIdUsuario(1);
        coordenador.setEmail("coord@example.org");
        coordenador.setIdPerfil(1);
        when(usuarios.findById(1)).thenReturn(Optional.of(coordenador));
        when(authentication.getName()).thenReturn("coord@example.org");

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.alterarPerfil(1, java.util.Map.of("idPerfil", 2), authentication));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        assertEquals(1, coordenador.getIdPerfil());
        verify(usuarios, never()).save(any());
        verifyNoInteractions(auditoria);
    }

    @Test
    void criaCadastroDeSolicitanteParaEquipeERegistraAuditoria() {
        Organizacao organizacao = new Organizacao();
        organizacao.setIdOrganizacao(12);
        organizacao.setNomeOrganizacao("InPETU Labs");
        when(usuarios.findByEmailIgnoreCase("novo@exemplo.org")).thenReturn(Optional.empty());
        when(organizacoes.findByNomeOrganizacaoIgnoreCase("InPETU Labs")).thenReturn(Optional.of(organizacao));
        when(usuarios.save(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            usuario.setIdUsuario(27);
            return usuario;
        });
        when(authentication.getName()).thenReturn("staff@example.org");
        when(usuarios.findByEmail("staff@example.org")).thenReturn(Optional.of(new Usuario()));
        when(passwordEncoder.encode("SenhaSegura123!")).thenReturn("bcrypt-hash");

        UsuarioResumo result = controller.criarCadastro(
            new CadastroPublicoRequest("  Joana Silva ", " NOVO@EXEMPLO.ORG ", "(48) 99999-1111", "InPETU Labs", "Coordenadora", "SenhaSegura123!"),
            authentication);

        assertEquals(27, result.idUsuario());
        assertEquals("novo@exemplo.org", result.email());
        assertEquals(4, result.idPerfil());
        assertEquals(12, result.idOrganizacao());
        assertNull(result.idPersona());
        ArgumentCaptor<Usuario> saved = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarios).save(saved.capture());
        assertEquals("Joana Silva", saved.getValue().getNomeCompleto());
        assertEquals("bcrypt-hash", saved.getValue().getSenhaHash());
        ArgumentCaptor<LogAuditoria> log = ArgumentCaptor.forClass(LogAuditoria.class);
        verify(auditoria).save(log.capture());
        assertEquals("CADASTRO_CRIADO", log.getValue().getAcao());
        assertEquals(27, log.getValue().getIdRegistroAfetado());
    }

    @Test
    void naoCriaCadastroComEmailJaUsado() {
        when(usuarios.findByEmailIgnoreCase("usado@exemplo.org")).thenReturn(Optional.of(new Usuario()));

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
            controller.criarCadastro(new CadastroPublicoRequest("Joana Silva", "usado@exemplo.org", null, "Org", "Gestora", "SenhaSegura123!"), authentication));

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(organizacoes, never()).save(any());
        verify(usuarios, never()).save(any());
        verifyNoInteractions(auditoria);
    }
}
