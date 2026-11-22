package com.isetconnect.backend.controller;

import com.isetconnect.backend.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

/**
 * Serves profile pictures without an Authorization header so the mobile Image component can load
 * them directly. File names are random and change on every upload, so responses can be cached.
 */
@RestController
@RequestMapping("/api/profile-pictures")
@RequiredArgsConstructor
public class ProfilePictureController {

    private final FileStorageService storage;

    @GetMapping("/{name}")
    public ResponseEntity<Resource> get(@PathVariable String name) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(storage.imageContentType(name)))
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic())
                .body(storage.load(name));
    }
}
