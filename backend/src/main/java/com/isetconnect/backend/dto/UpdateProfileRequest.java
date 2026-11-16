package com.isetconnect.backend.dto;

import jakarta.validation.constraints.Size;


public record UpdateProfileRequest(
        @Size(min = 1, max = 120) String nomPrenom,
        @Size(min = 6, max = 100) String password,
        @Size(max = 40) String classe) {
}
