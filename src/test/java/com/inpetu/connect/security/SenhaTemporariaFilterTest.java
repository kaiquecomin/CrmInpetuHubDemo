package com.inpetu.connect.security;

import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class SenhaTemporariaFilterTest {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final SenhaTemporariaFilter filter = new SenhaTemporariaFilter(usuarios);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void bloqueiaApiEnquantoSenhaTemporariaAtiva() throws Exception {
        autenticar();
        Usuario usuario = new Usuario();
        usuario.setSenhaTemporaria(true);
        when(usuarios.findByEmailIgnoreCase("temporary@example.org")).thenReturn(Optional.of(usuario));
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/reservas/minhas");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(HttpServletResponse.SC_FORBIDDEN, response.getStatus());
        assertEquals(true, response.getContentAsString().contains("SENHA_TEMPORARIA"));
    }

    @Test
    void permiteSomenteTrocaDeSenhaELogoutDuranteRestricao() throws Exception {
        autenticar();
        Usuario usuario = new Usuario();
        usuario.setSenhaTemporaria(true);
        when(usuarios.findByEmailIgnoreCase("temporary@example.org")).thenReturn(Optional.of(usuario));
        MockHttpServletRequest request = new MockHttpServletRequest("PUT", "/api/v1/usuarios/me/senha");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(HttpServletResponse.SC_OK, response.getStatus());
    }

    private void autenticar() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("temporary@example.org", null, java.util.List.of()));
    }
}
