package com.isetconnect.backend.service;

import com.isetconnect.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;


@Service
public class FileStorageService {

    private final Path root;

    public FileStorageService(@Value("${app.upload-dir}") String uploadDir) throws IOException {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }


    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Empty file");
        }
        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0) {
            String raw = original.substring(dot + 1).replaceAll("[^A-Za-z0-9]", "");
            if (!raw.isEmpty() && raw.length() <= 10) {
                ext = "." + raw.toLowerCase();
            }
        }
        String stored = UUID.randomUUID() + ext;
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, root.resolve(stored), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Could not store file", e);
        }
        return stored;
    }

    public Resource load(String storedName) {
        Path p = root.resolve(storedName).normalize();
        if (!p.startsWith(root) || !Files.exists(p)) {
            throw ApiException.notFound("File not found");
        }
        try {
            return new UrlResource(p.toUri());
        } catch (MalformedURLException e) {
            throw ApiException.notFound("File not found");
        }
    }

    public void delete(String storedName) {
        if (storedName == null) {
            return;
        }
        try {
            Path p = root.resolve(storedName).normalize();
            if (p.startsWith(root)) {
                Files.deleteIfExists(p);
            }
        } catch (IOException ignored) {

        }
    }
}
