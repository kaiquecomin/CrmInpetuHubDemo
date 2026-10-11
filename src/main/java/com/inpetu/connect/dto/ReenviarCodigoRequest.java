package com.inpetu.connect.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ReenviarCodigoRequest(@NotBlank @Email String email) {
}
