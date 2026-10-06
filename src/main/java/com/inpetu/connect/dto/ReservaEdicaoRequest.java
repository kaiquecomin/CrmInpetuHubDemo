package com.inpetu.connect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;

public record ReservaEdicaoRequest(
        @NotBlank @Size(max = 150) String tituloEvento,
        @NotBlank String descricaoFinalidade,
        @NotNull LocalDate dataReserva,
        @NotNull LocalTime horarioInicio,
        @NotNull LocalTime horarioFim,
        @NotNull Integer idEspaco,
        Integer quantidadeParticipantes) {
}
