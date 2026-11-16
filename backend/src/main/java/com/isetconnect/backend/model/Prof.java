package com.isetconnect.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "profs")
@NoArgsConstructor
public class Prof extends User {
    @Override
    public Role getRole() {
        return Role.PROF;
    }
}
