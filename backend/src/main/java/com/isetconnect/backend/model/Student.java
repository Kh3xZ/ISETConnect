package com.isetconnect.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
public class Student extends User {


    @Column(length = 40)
    private String classe;

    @Override
    public Role getRole() {
        return Role.STUDENT;
    }
}
