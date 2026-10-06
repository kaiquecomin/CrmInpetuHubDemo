package com.inpetu.connect.dto;

import jakarta.validation.constraints.NotBlank;

public record DescredenciarRequest(@NotBlank(message = "O motivo do descredenciamento é obrigatório") String motivoDescredenciamento) {}
