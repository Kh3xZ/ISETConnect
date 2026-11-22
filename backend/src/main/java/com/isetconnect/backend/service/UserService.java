package com.isetconnect.backend.service;

import com.isetconnect.backend.dto.*;
import com.isetconnect.backend.exception.ApiException;
import com.isetconnect.backend.model.*;
import com.isetconnect.backend.repository.UserRepository;
import com.isetconnect.backend.util.ClassCatalog;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final FileStorageService storage;

    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        return UserResponse.from(find(id));
    }


    @Transactional(readOnly = true)
    public PageResponse<UserResponse> search(String q, Department department, Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("nomPrenom")), like),
                        cb.like(cb.lower(root.get("email")), like)));
            }
            if (department != null) {
                predicates.add(cb.equal(root.get("department"), department));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return PageResponse.of(users.findAll(spec, pageable).map(UserResponse::from));
    }

    @Transactional
    public UserResponse updateMe(User current, UpdateProfileRequest req) {
        User u = find(current.getId());
        if (req.nomPrenom() != null && !req.nomPrenom().isBlank()) {
            u.setNomPrenom(req.nomPrenom().trim());
        }
        if (req.password() != null && !req.password().isBlank()) {
            u.setPassword(encoder.encode(req.password()));
        }
        if (req.classe() != null && !req.classe().isBlank()) {
            if (!(Hibernate.unproxy(u) instanceof Student s)) {
                throw ApiException.badRequest("Only students have a class");
            }
            if (!ClassCatalog.isValid(u.getDepartment(), req.classe())) {
                throw ApiException.badRequest("This class does not belong to your department");
            }
            s.setClasse(req.classe().trim());
        }
        return UserResponse.from(users.save(u));
    }

    @Transactional
    public UserResponse updateProfilePicture(User current, MultipartFile file) {
        User u = find(current.getId());
        String oldUrl = u.getProfilePictureUrl();
        String stored = storage.storeImage(file);
        u.setProfilePictureUrl(storage.profilePictureUrl(stored));
        users.save(u);
        storage.deleteProfilePicture(oldUrl);
        return UserResponse.from(u);
    }

    @Transactional
    public UserResponse removeProfilePicture(User current) {
        User u = find(current.getId());
        String oldUrl = u.getProfilePictureUrl();
        u.setProfilePictureUrl(null);
        users.save(u);
        storage.deleteProfilePicture(oldUrl);
        return UserResponse.from(u);
    }


    @Transactional
    public UserResponse adminCreate(CreateUserRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Email already in use");
        }
        User u;
        switch (req.role()) {
            case STUDENT -> {
                if (!ClassCatalog.isValid(req.department(), req.classe())) {
                    throw ApiException.badRequest("A student needs a department and one of its classes");
                }
                Student s = new Student();
                s.setClasse(req.classe().trim());
                u = s;
            }
            case PROF -> {
                if (req.department() == null) {
                    throw ApiException.badRequest("A prof needs a department");
                }
                u = new Prof();
            }
            default -> u = new Admin();
        }
        u.setDepartment(req.department());
        u.setNomPrenom(req.nomPrenom().trim());
        u.setEmail(email);
        u.setPassword(encoder.encode(req.password()));
        return UserResponse.from(users.save(u));
    }

    @Transactional
    public void adminDelete(Long id, User current) {
        if (id.equals(current.getId())) {
            throw ApiException.badRequest("You cannot delete your own account");
        }
        users.delete(find(id));
    }

    private User find(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
    }
}
