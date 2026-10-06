package com.inpetu.connect.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.FutureOrPresent;
import java.time.LocalDate;

public record EspacoStatusRequest(
    @NotNull Boolean ativo,
    @Size(max = 500) String motivoIndisponibilidade,
    @FutureOrPresent LocalDate dataPrevisaoRetorno
) {}
