package com.inpetu.connect.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalTime;

public record ReservaRequest(
    @NotBlank @Size(max = 150) String tituloEvento,
    @NotBlank String descricaoFinalidade,
    @NotNull @FutureOrPresent LocalDate dataReserva,
    @NotNull LocalTime horarioInicio,
    @NotNull LocalTime horarioFim,
    @NotNull Integer idEspaco,
    @Min(1) Integer quantidadeParticipantes,
    @Size(max = 20) String telefoneContato
) {
    public ReservaRequest(String tituloEvento, String descricaoFinalidade, LocalDate dataReserva,
            LocalTime horarioInicio, LocalTime horarioFim, Integer idEspaco,
            Integer quantidadeParticipantes) {
        this(tituloEvento, descricaoFinalidade, dataReserva, horarioInicio, horarioFim,
                idEspaco, quantidadeParticipantes, null);
    }
}
