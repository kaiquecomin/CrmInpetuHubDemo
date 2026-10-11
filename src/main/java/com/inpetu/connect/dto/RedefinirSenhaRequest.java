package com.inpetu.connect.dto;

import jakarta.validation.constraints.Size;

public record RedefinirSenhaRequest(
    Boolean gerarAutomaticamente,
    @Size(max = 64) String senhaTemporaria
) {}
