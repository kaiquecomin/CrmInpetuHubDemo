package com.inpetu.connect.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CadastroEdicaoRequest(
        @NotBlank @Size(max = 100) String nomeCompleto,
        @NotBlank @Email @Size(max = 100) String email,
        @Size(max = 20) String telefone,
        @NotBlank @Size(max = 100) String organizacao,
        @NotBlank @Size(max = 100) String cargoVinculo) {
}
