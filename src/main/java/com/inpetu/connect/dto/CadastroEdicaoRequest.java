package com.inpetu.connect.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CadastroEdicaoRequest(
        @NotBlank @Size(max = 100) String nomeCompleto,
        @NotBlank @Email @Size(max = 100) String email,
        @Size(max = 20) @Pattern(regexp = "^$|\\(\\d{2}\\) 9\\d{4}-\\d{4}",
                message = "Informe um celular no formato (48) 99999-9999.") String telefone,
        @NotBlank @Size(max = 100) String organizacao,
        @NotBlank @Size(max = 100) String cargoVinculo) {
}
