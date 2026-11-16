package com.isetconnect.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;






public record CommunityRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 2000) String description,
        Boolean isPrivate,
        @Size(min = 4, max = 100) String key,
        Integer nbMax) {
}
