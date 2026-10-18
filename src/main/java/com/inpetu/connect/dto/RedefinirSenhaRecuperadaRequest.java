package com.inpetu.connect.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RedefinirSenhaRecuperadaRequest(
    @NotBlank @Email @Size(max = 100) String email,
    @NotBlank @Pattern(regexp = "\\d{6}") String codigo,
    @NotBlank @Size(min = 8, max = 64) String novaSenha
) {}
