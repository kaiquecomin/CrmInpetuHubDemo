package com.inpetu.connect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NegociacaoCotaRequest(@NotBlank @Size(max = 4000) String observacao) {
}
