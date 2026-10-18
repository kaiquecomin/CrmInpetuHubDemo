package com.inpetu.connect.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EspacoCriacaoRequest(
    @NotBlank @Size(max = 100) String nomeEspaco,
    @NotBlank @Size(max = 50) String tipoEspaco,
    @NotNull @Min(1) Integer capacidadePessoas,
    @Size(max = 2000) String equipamentosDisponiveis,
    @Size(max = 2000) String descricao,
    boolean exigeAprovacaoManual
) {}
