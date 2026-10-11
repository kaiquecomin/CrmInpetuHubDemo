package com.inpetu.connect.config;

import com.inpetu.connect.model.Organizacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InitialAdminBootstrapTest {
    @Test
    void doesNotCreateAnAccountWithoutExplicitBootstrapCredentials() throws Exception {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        OrganizacaoRepository organizacoes = mock(OrganizacaoRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);

        ApplicationRunner runner = new InitialAdminBootstrap().bootstrapAdmin(usuarios, organizacoes, encoder, "", "");
        runner.run(mock(ApplicationArguments.class));

        verify(usuarios).existsByIdPerfil(1);
        verifyNoMoreInteractions(usuarios);
        verifyNoInteractions(organizacoes, encoder);
    }

    @Test
    void createsCoordinatorOnlyWhenCredentialsAreExplicitlyConfigured() throws Exception {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        OrganizacaoRepository organizacoes = mock(OrganizacaoRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        Organizacao organizacao = new Organizacao();
        organizacao.setIdOrganizacao(3);
        when(usuarios.existsByIdPerfil(1)).thenReturn(false);
        when(organizacoes.findByNomeOrganizacaoIgnoreCase("UFSC / InPETU Hub")).thenReturn(Optional.of(organizacao));
        when(encoder.encode("Local-Bootstrap-Only-Secret")).thenReturn("bcrypt-hash");

        ApplicationRunner runner = new InitialAdminBootstrap().bootstrapAdmin(
            usuarios, organizacoes, encoder, " admin@example.test ", "Local-Bootstrap-Only-Secret");
        runner.run(mock(ApplicationArguments.class));

        var captor = org.mockito.ArgumentCaptor.forClass(Usuario.class);
        verify(usuarios).save(captor.capture());
        assertEquals("admin@example.test", captor.getValue().getEmail());
        assertEquals(1, captor.getValue().getIdPerfil());
        assertEquals(3, captor.getValue().getIdOrganizacao());
        assertEquals("bcrypt-hash", captor.getValue().getSenhaHash());
        verify(encoder).encode("Local-Bootstrap-Only-Secret");
    }

    @Test
    void doesNotCreateAnotherCoordinatorWhenOneAlreadyExists() throws Exception {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        OrganizacaoRepository organizacoes = mock(OrganizacaoRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(usuarios.existsByIdPerfil(1)).thenReturn(true);

        ApplicationRunner runner = new InitialAdminBootstrap().bootstrapAdmin(
            usuarios, organizacoes, encoder, "admin@example.test", "configured-value-long-enough");
        runner.run(mock(ApplicationArguments.class));

        verify(usuarios).existsByIdPerfil(1);
        verifyNoMoreInteractions(usuarios);
        verifyNoInteractions(organizacoes, encoder);
    }

    @Test
    void rejectsShortBootstrapPassword() {
        InitialAdminBootstrap bootstrap = new InitialAdminBootstrap();
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        OrganizacaoRepository organizacoes = mock(OrganizacaoRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);

        ApplicationRunner runner = bootstrap.bootstrapAdmin(usuarios, organizacoes, encoder, "admin@example.test", "short");

        assertThrows(IllegalStateException.class, () -> runner.run(mock(ApplicationArguments.class)));
        verify(usuarios).existsByIdPerfil(1);
        verifyNoMoreInteractions(usuarios);
        verifyNoInteractions(organizacoes, encoder);
    }
}
