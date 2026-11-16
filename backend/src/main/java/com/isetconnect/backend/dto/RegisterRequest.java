package com.isetconnect.backend.dto;

import com.isetconnect.backend.model.Department;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;


public record RegisterRequest(
        @NotBlank @Size(max = 120) String nomPrenom,
        @NotBlank @Email @Size(max = 160) String email,
        @NotBlank @Size(min = 6, max = 100) String password,
        @NotNull Department department,
        @NotBlank @Size(max = 40) String classe) {
}
