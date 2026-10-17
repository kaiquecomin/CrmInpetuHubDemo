package com.inpetu.connect.controller;

import com.inpetu.connect.dto.ReservaRequest;
import com.inpetu.connect.dto.ReservaSolicitanteResumo;
import com.inpetu.connect.dto.CancelamentoRequest;
import com.inpetu.connect.model.Reserva;
import com.inpetu.connect.repository.ReservaRepository;
import com.inpetu.connect.service.ReservaService;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReservaControllerTest {
    @Test
    void criacaoRetornaSomenteResumoSeguroParaSolicitante() {
        ReservaService service = mock(ReservaService.class);
        ReservaRepository repository = mock(ReservaRepository.class);
        Authentication authentication = mock(Authentication.class);
        Reserva reserva = new Reserva();
        reserva.setIdReserva(15);
        reserva.setIdSolicitante(7);
        reserva.setTituloEvento("Oficina");
        reserva.setDataReserva(LocalDate.of(2026, 10, 12));
        reserva.setHorarioInicio(LocalTime.of(10, 0));
        reserva.setHorarioFim(LocalTime.of(11, 0));
        reserva.setStatusReserva("Pendente");
        reserva.setExcedeCota(true);
        when(authentication.getName()).thenReturn("solicitante@example.test");
        when(service.criar(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(reserva);

        ReservaSolicitanteResumo result = new ReservaController(service, repository).criar(
                new ReservaRequest("Oficina", "Encontro", LocalDate.of(2026, 10, 12),
                        LocalTime.of(10, 0), LocalTime.of(11, 0), 2, null),
                authentication);

        assertEquals(15, result.idReserva());
        assertEquals("Pendente", result.statusReserva());
        assertFalse(java.util.Arrays.stream(ReservaSolicitanteResumo.class.getRecordComponents())
                .anyMatch(component -> component.getName().equals("excedeCota")
                        || component.getName().equals("idPersona")));
    }

    @Test
    void cancelamentoRetornaStatusAtualizadoEContatoDaReserva() {
        ReservaService service = mock(ReservaService.class);
        ReservaRepository repository = mock(ReservaRepository.class);
        Authentication authentication = mock(Authentication.class);
        Reserva reserva = new Reserva();
        reserva.setIdReserva(15);
        reserva.setIdSolicitante(7);
        reserva.setStatusReserva("Cancelada");
        reserva.setTelefoneContato("48999999999");
        when(authentication.getName()).thenReturn("solicitante@example.test");
        when(service.cancelar(15, "Mudança de agenda", "solicitante@example.test")).thenReturn(reserva);

        ReservaSolicitanteResumo result = new ReservaController(service, repository).cancelar(15,
                new CancelamentoRequest("Mudança de agenda"), authentication);

        assertEquals("Cancelada", result.statusReserva());
        assertEquals("48999999999", result.telefoneContato());
    }
}
