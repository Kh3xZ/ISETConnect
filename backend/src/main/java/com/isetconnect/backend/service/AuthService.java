package com.isetconnect.backend.service;

import com.isetconnect.backend.dto.*;
import com.isetconnect.backend.exception.ApiException;
import com.isetconnect.backend.model.Student;
import com.isetconnect.backend.model.User;
import com.isetconnect.backend.repository.UserRepository;
import com.isetconnect.backend.security.JwtService;
import com.isetconnect.backend.util.ClassCatalog;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;


    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Email already in use");
        }
        String classe = req.classe().trim();
        if (!ClassCatalog.isValid(req.department(), classe)) {
            throw ApiException.badRequest("This class does not belong to the selected department");
        }
        Student s = new Student();
        s.setDepartment(req.department());
        s.setClasse(classe);
        s.setNomPrenom(req.nomPrenom().trim());
        s.setEmail(email);
        s.setPassword(encoder.encode(req.password()));
        users.save(s);
        return AuthResponse.bearer(jwt.generateToken(s), UserResponse.from(s));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        User u = users.findByEmailIgnoreCase(req.email().trim())
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        if (!encoder.matches(req.password(), u.getPassword())) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        return AuthResponse.bearer(jwt.generateToken(u), UserResponse.from(u));
    }
}
