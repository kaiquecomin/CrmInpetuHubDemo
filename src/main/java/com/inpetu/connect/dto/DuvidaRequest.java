package com.inpetu.connect.dto;

import jakarta.validation.constraints.*;

public record DuvidaRequest(
    @NotBlank @Email @Size(max = 100) String emailContato,
    @Size(max = 20) String telefoneContato,
    @NotBlank @Size(max = 5000) String mensagemDuvida
) {}
