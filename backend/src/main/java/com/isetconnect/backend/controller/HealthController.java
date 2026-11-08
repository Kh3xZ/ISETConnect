package com.isetconnect.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("message", "IsetConnect Backend is running successfully!");
        response.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/test/db")
    public ResponseEntity<Map<String, Object>> testDb() {
        Map<String, Object> response = new HashMap<>();
        try {
            if (jdbcTemplate != null) {
                Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
                response.put("database", "CONNECTED");
                response.put("message", "PostgreSQL database connection is active!");
                response.put("queryResult", result);
                return ResponseEntity.ok(response);
            } else {
                response.put("database", "UNAVAILABLE");
                response.put("message", "JdbcTemplate is not configured.");
                return ResponseEntity.status(500).body(response);
            }
        } catch (Exception e) {
            response.put("database", "ERROR");
            response.put("message", "Failed to connect to PostgreSQL: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}

