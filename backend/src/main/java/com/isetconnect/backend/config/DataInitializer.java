package com.isetconnect.backend.config;

import com.isetconnect.backend.model.Admin;
import com.isetconnect.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;


@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    @Value("${app.admin.name}")
    private String adminName;
    @Value("${app.admin.email}")
    private String adminEmail;
    @Value("${app.admin.password}")
    private String adminPassword;

    @Override
    public void run(ApplicationArguments args) {
        String email = adminEmail.trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            return;
        }
        Admin admin = new Admin();
        admin.setNomPrenom(adminName);
        admin.setEmail(email);
        admin.setPassword(encoder.encode(adminPassword));
        users.save(admin);
        log.warn("Default admin created: {} (change its password / set ADMIN_PASSWORD in .env)", email);
    }
}
