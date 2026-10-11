package com.inpetu.connect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AlterarSenhaRequest(
    @NotBlank String senhaAtual,
    @NotBlank @Size(min = 8, max = 64) String novaSenha,
    @NotBlank @Size(min = 8, max = 64) String confirmarSenha
) {}
