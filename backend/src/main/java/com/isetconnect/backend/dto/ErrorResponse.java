package com.isetconnect.backend.dto;

import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(Instant timestamp, int status, String error, String message,
                            Map<String, String> fieldErrors) {

    public static ErrorResponse of(HttpStatus status, String message, Map<String, String> fieldErrors) {
        return new ErrorResponse(Instant.now(), status.value(), status.getReasonPhrase(), message, fieldErrors);
    }
}
