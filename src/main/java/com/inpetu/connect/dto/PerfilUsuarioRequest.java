package com.inpetu.connect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PerfilUsuarioRequest(
    @NotBlank @Size(max = 100) String nomeCompleto,
    @Size(max = 20) String telefone,
    @NotBlank @Size(max = 100) String organizacao,
    @NotBlank @Size(max = 100) String cargoVinculo
) {}
