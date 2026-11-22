package com.isetconnect.backend.dto;

import com.isetconnect.backend.model.Department;
import com.isetconnect.backend.model.Role;
import com.isetconnect.backend.model.Student;
import com.isetconnect.backend.model.User;
import com.isetconnect.backend.util.ClassCatalog;
import org.hibernate.Hibernate;


public record UserSummary(Long id, String nomPrenom, Role role, Department department,
                          String classe, String level, String profilePictureUrl) {

    public static UserSummary from(User u) {
        String classe = Hibernate.unproxy(u) instanceof Student s ? s.getClasse() : null;
        return new UserSummary(u.getId(), u.getNomPrenom(), u.getRole(), u.getDepartment(),
                classe, ClassCatalog.levelOf(classe), u.getProfilePictureUrl());
    }
}
