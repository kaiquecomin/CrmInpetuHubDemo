package com.inpetu.connect.dto;

import jakarta.validation.constraints.NotBlank;

public record CancelamentoRequest(@NotBlank(message = "O motivo do cancelamento é obrigatório") String motivoCancelamento) {}
