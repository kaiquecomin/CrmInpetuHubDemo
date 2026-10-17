package com.inpetu.connect.dto;

import com.inpetu.connect.model.Reserva;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record ReservaSolicitanteResumo(
        Integer idReserva,
        String tituloEvento,
        String descricaoFinalidade,
        LocalDate dataReserva,
        LocalTime horarioInicio,
        LocalTime horarioFim,
        Integer quantidadeParticipantes,
        String statusReserva,
        Integer idEspaco,
        Integer idSolicitante,
        LocalDateTime dataSolicitacao,
        String telefoneContato) {

    public static ReservaSolicitanteResumo from(Reserva reserva) {
        return new ReservaSolicitanteResumo(reserva.getIdReserva(), reserva.getTituloEvento(),
                reserva.getDescricaoFinalidade(), reserva.getDataReserva(), reserva.getHorarioInicio(),
                reserva.getHorarioFim(), reserva.getQuantidadeParticipantes(), reserva.getStatusReserva(),
                reserva.getIdEspaco(), reserva.getIdSolicitante(), reserva.getDataSolicitacao(),
                reserva.getTelefoneContato());
    }
}
