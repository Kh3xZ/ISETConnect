package com.isetconnect.backend.dto;

import com.isetconnect.backend.model.Department;
import com.isetconnect.backend.model.Role;
import com.isetconnect.backend.model.Student;
import com.isetconnect.backend.model.User;
import com.isetconnect.backend.util.ClassCatalog;
import org.hibernate.Hibernate;

import java.time.Instant;


public record UserResponse(Long id, String nomPrenom, String email, Role role,
                           Department department, String departmentLabel,
                           String classe, String level, String profilePictureUrl,
                           Instant createdAt) {

    public static UserResponse from(User u) {
        String classe = Hibernate.unproxy(u) instanceof Student s ? s.getClasse() : null;
        Department d = u.getDepartment();
        return new UserResponse(u.getId(), u.getNomPrenom(), u.getEmail(), u.getRole(),
                d, d == null ? null : d.getLabel(), classe, ClassCatalog.levelOf(classe),
                u.getProfilePictureUrl(), u.getCreatedAt());
    }
}
