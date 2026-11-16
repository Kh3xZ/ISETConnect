package com.isetconnect.backend.dto;

import com.isetconnect.backend.model.Department;
import com.isetconnect.backend.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;





public record CreateUserRequest(
        @NotBlank @Size(max = 120) String nomPrenom,
        @NotBlank @Email @Size(max = 160) String email,
        @NotBlank @Size(min = 6, max = 100) String password,
        @NotNull Role role,
        Department department,
        @Size(max = 40) String classe) {
}
