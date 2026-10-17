package com.inpetu.connect.controller;

import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.DuvidaAtendimentoRepository;
import com.inpetu.connect.repository.EspacoRepository;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.ReservaRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.ui.ConcurrentModel;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PainelAdministrativoControllerTest {
    private final ReservaRepository reservas = mock(ReservaRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final OrganizacaoRepository organizacoes = mock(OrganizacaoRepository.class);
    private final EspacoRepository espacos = mock(EspacoRepository.class);
    private final DuvidaAtendimentoRepository duvidas = mock(DuvidaAtendimentoRepository.class);
    private final PainelAdministrativoController controller = new PainelAdministrativoController(
            reservas, usuarios, organizacoes, espacos, duvidas);

    @Test
    void redirectsAnonymousVisitorsToTheLoginScreen() {
        var response = new MockHttpServletResponse();

        String view = controller.index(null, new ConcurrentModel(), response);

        assertEquals("redirect:/?view=access", view);
        assertEquals("no-store", response.getHeader("Cache-Control"));
    }

    @Test
    void redirectsUsersOutsideTheTeam() {
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                "visitor@example.test", null, List.of(new SimpleGrantedAuthority("ROLE_SOLICITANTE")));

        String view = controller.index(authentication, new ConcurrentModel(), new MockHttpServletResponse());

        assertEquals("redirect:/", view);
    }

    @Test
    void rendersOverviewForStaffAndLoadsSummaryData() {
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                "staff@example.test", null, List.of(new SimpleGrantedAuthority("ROLE_STAFF")));
        var response = new MockHttpServletResponse();
        var model = new ConcurrentModel();
        Usuario usuario = new Usuario();
        usuario.setNomeCompleto("Ana Silva");
        when(usuarios.findByEmailIgnoreCase("staff@example.test")).thenReturn(Optional.of(usuario));
        when(reservas.findByDataReservaAndStatusReservaIn(any(), any())).thenReturn(List.of());
        when(espacos.findAllById(List.of())).thenReturn(List.of());
        when(usuarios.findAllById(List.of())).thenReturn(List.of());
        when(espacos.countByAtivoTrue()).thenReturn(4L);
        when(reservas.countByStatusReserva("Pendente")).thenReturn(2L);
        when(organizacoes.count()).thenReturn(3L);
        when(duvidas.countByStatusAtendimento("Pendente")).thenReturn(1L);

        String view = controller.index(authentication, model, response);

        assertEquals("paineladm/index", view);
        assertEquals("Ana", model.getAttribute("nome"));
        assertEquals(0, model.getAttribute("reservasHoje"));
        assertEquals(2L, model.getAttribute("reservasPendentes"));
        assertEquals(4L, model.getAttribute("espacosAtivos"));
        assertEquals(3L, model.getAttribute("organizacoes"));
        assertEquals(1L, model.getAttribute("duvidasPendentes"));
        verify(reservas).findByDataReservaAndStatusReservaIn(any(), any());
    }
}
