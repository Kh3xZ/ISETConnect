package com.isetconnect.backend.model;

import java.util.List;

public enum Role {
    STUDENT, PROF, ADMIN;


    public List<String> authorities() {
        return switch (this) {
            case STUDENT -> List.of("ROLE_STUDENT");
            case PROF -> List.of("ROLE_PROF");
            case ADMIN -> List.of("ROLE_ADMIN", "ROLE_PROF");
        };
    }
}
