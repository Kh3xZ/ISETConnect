package com.isetconnect.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "admins")
@NoArgsConstructor
public class Admin extends Prof {
    @Override
    public Role getRole() {
        return Role.ADMIN;
    }
}
