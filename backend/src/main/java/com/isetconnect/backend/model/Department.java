package com.isetconnect.backend.model;

public enum Department {
    GENIE_CIVIL("Génie Civil"),
    GENIE_ELECTRIQUE("Génie Électrique"),
    GENIE_MECANIQUE("Génie Mécanique"),
    GESTION("Gestion"),
    TECHNOLOGIES_INFORMATIQUE("Technologies de l'Informatique");

    private final String label;

    Department(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
