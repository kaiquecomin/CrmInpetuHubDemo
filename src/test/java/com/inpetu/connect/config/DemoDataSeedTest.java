package com.inpetu.connect.config;

import com.inpetu.connect.model.DuvidaAtendimento;
import com.inpetu.connect.model.Espaco;
import com.inpetu.connect.model.Organizacao;
import com.inpetu.connect.model.Reserva;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.DuvidaAtendimentoRepository;
import com.inpetu.connect.repository.EspacoRepository;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.ReservaRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DemoDataSeedTest {
    @Test
    void seedsSyntheticAccountsBookingsAndTicketsOnlyOnce() throws Exception {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        OrganizacaoRepository organizacoes = mock(OrganizacaoRepository.class);
        EspacoRepository espacos = mock(EspacoRepository.class);
        ReservaRepository reservas = mock(ReservaRepository.class);
        DuvidaAtendimentoRepository duvidas = mock(DuvidaAtendimentoRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);

        Map<String, Usuario> pessoas = new HashMap<>();
        Map<String, Organizacao> orgs = new HashMap<>();
        Set<String> reservasSeed = new HashSet<>();
        List<Reserva> reservasSalvas = new ArrayList<>();
        Set<String> chamadosSeed = new HashSet<>();
        AtomicInteger userId = new AtomicInteger();
        AtomicInteger organizationId = new AtomicInteger();
        AtomicInteger spaceId = new AtomicInteger();

        when(usuarios.findByEmailIgnoreCase(any())).thenAnswer(invocation ->
            Optional.ofNullable(pessoas.get(invocation.getArgument(0))));
        when(usuarios.save(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            if (usuario.getIdUsuario() == null) usuario.setIdUsuario(userId.incrementAndGet());
            pessoas.put(usuario.getEmail(), usuario);
            return usuario;
        });
        when(organizacoes.findByNomeOrganizacaoIgnoreCase(any())).thenAnswer(invocation -> {
            String name = invocation.getArgument(0);
            return Optional.ofNullable(orgs.get(name.toLowerCase(Locale.ROOT)));
        });
        when(organizacoes.save(any(Organizacao.class))).thenAnswer(invocation -> {
            Organizacao organizacao = invocation.getArgument(0);
            organizacao.setIdOrganizacao(organizationId.incrementAndGet());
            orgs.put(organizacao.getNomeOrganizacao().toLowerCase(), organizacao);
            return organizacao;
        });
        when(encoder.encode(anyString())).thenAnswer(invocation -> "encoded-" + invocation.getArgument(0));
        when(encoder.matches(anyString(), anyString())).thenAnswer(invocation ->
            invocation.getArgument(1).equals("encoded-" + invocation.getArgument(0)));
        when(espacos.findByNomeEspacoIgnoreCase(any())).thenAnswer(invocation -> {
            Espaco espaco = new Espaco();
            espaco.setIdEspaco(spaceId.incrementAndGet());
            espaco.setNomeEspaco(invocation.getArgument(0));
            return Optional.of(espaco);
        });
        when(reservas.existsByTituloEventoAndIdSolicitante(any(), any())).thenAnswer(invocation ->
            reservasSeed.contains(invocation.getArgument(0) + "|" + invocation.getArgument(1)));
        when(reservas.save(any(Reserva.class))).thenAnswer(invocation -> {
            Reserva reserva = invocation.getArgument(0);
            reservasSeed.add(reserva.getTituloEvento() + "|" + reserva.getIdSolicitante());
            reservasSalvas.add(reserva);
            return reserva;
        });
        when(duvidas.existsByEmailContatoAndMensagemDuvida(any(), any())).thenAnswer(invocation ->
            chamadosSeed.contains(invocation.getArgument(0) + "|" + invocation.getArgument(1)));
        when(duvidas.save(any(DuvidaAtendimento.class))).thenAnswer(invocation -> {
            DuvidaAtendimento chamado = invocation.getArgument(0);
            chamadosSeed.add(chamado.getEmailContato() + "|" + chamado.getMensagemDuvida());
            return chamado;
        });

        ApplicationRunner runner = new DemoDataSeed().seedDemoData(
            usuarios, organizacoes, espacos, reservas, duvidas, encoder,
            "jdbc:mysql://localhost:3306/inpetu_connect", false);
        ApplicationArguments args = mock(ApplicationArguments.class);
        runner.run(args);
        runner.run(args);

        assertEquals(13, pessoas.size());
        assertEquals(10, orgs.size());
        assertEquals(9, reservasSeed.size());
        assertEquals(7, reservasSalvas.stream().filter(reserva -> "Pendente".equals(reserva.getStatusReserva())).count());
        assertEquals(2, reservasSalvas.stream().filter(reserva -> "Confirmada".equals(reserva.getStatusReserva())).count());
        for (int i = 0; i < reservasSalvas.size(); i++) {
            Reserva left = reservasSalvas.get(i);
            for (int j = i + 1; j < reservasSalvas.size(); j++) {
                Reserva right = reservasSalvas.get(j);
                if (left.getIdEspaco().equals(right.getIdEspaco()) && left.getDataReserva().equals(right.getDataReserva())
                        && !"Cancelada".equals(left.getStatusReserva()) && !"Cancelada".equals(right.getStatusReserva())) {
                    assertFalse(left.getHorarioInicio().isBefore(right.getHorarioFim())
                            && left.getHorarioFim().isAfter(right.getHorarioInicio()),
                            "Reservas demo não devem ocupar o mesmo intervalo.");
                }
            }
        }
        assertEquals(3, chamadosSeed.size());
        assertEquals(1, pessoas.get("demo.coordenacao@inpetu.test").getIdPerfil());
        assertEquals(3, pessoas.get("demo.atendimento@inpetu.test").getIdPerfil());
        assertEquals(4, pessoas.get("ana@laboratorio-lagoa.test").getIdPerfil());
        assertEquals("encoded-Gestor-Demo-2026!", pessoas.get("demo.gestor@inpetu.test").getSenhaHash());
        ArgumentCaptor<String> passwordCaptor = ArgumentCaptor.forClass(String.class);
        verify(encoder, times(13)).encode(passwordCaptor.capture());
        assertEquals(13, passwordCaptor.getAllValues().stream().distinct().count());
        assertTrue(orgs.containsKey("acate labs (demo)"));
        assertEquals("Empresa parceira (DEMO)", orgs.get("acate labs (demo)").getTipoOrganizacao());
        verify(usuarios, times(13)).save(any(Usuario.class));
        verify(reservas, times(9)).save(any(Reserva.class));
        verify(duvidas, times(3)).save(any(DuvidaAtendimento.class));
    }

    @Test
    void refusesNonLocalDatabaseWithoutExplicitApproval() throws Exception {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        OrganizacaoRepository organizacoes = mock(OrganizacaoRepository.class);
        EspacoRepository espacos = mock(EspacoRepository.class);
        ReservaRepository reservas = mock(ReservaRepository.class);
        DuvidaAtendimentoRepository duvidas = mock(DuvidaAtendimentoRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        ApplicationRunner runner = new DemoDataSeed().seedDemoData(
            usuarios, organizacoes, espacos, reservas, duvidas, encoder,
            "jdbc:mysql://production.example:3306/inpetu_connect", false);

        IllegalStateException error = assertThrows(IllegalStateException.class, () -> runner.run(mock(ApplicationArguments.class)));

        assertTrue(error.getMessage().contains("banco local"));
        verifyNoInteractions(usuarios, organizacoes, espacos, reservas, duvidas, encoder);
    }
}
