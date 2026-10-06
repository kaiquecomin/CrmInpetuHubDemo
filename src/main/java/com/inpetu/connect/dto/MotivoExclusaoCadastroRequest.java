package com.inpetu.connect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MotivoExclusaoCadastroRequest(
    @NotBlank(message = "O motivo da exclusão é obrigatório")
    @Size(max = 1000, message = "O motivo deve ter no máximo 1000 caracteres")
    String motivo
) {}
