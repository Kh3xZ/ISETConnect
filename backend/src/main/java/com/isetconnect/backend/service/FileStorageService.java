package com.isetconnect.backend.service;

import com.isetconnect.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;


@Service
public class FileStorageService {

    /** Public, unauthenticated route served by ProfilePictureController. */
    public static final String PROFILE_PICTURE_PREFIX = "/api/profile-pictures/";

    private static final Map<String, String> IMAGE_EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp");

    private final Path root;
    private final DataSize profilePictureMaxSize;

    public FileStorageService(@Value("${app.upload-dir}") String uploadDir,
                              @Value("${app.profile-picture.max-size}") String profilePictureMaxSize) throws IOException {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.profilePictureMaxSize = DataSize.parse(profilePictureMaxSize);
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

    /**
     * Stores a validated profile picture and returns the safe, randomly generated file name.
     * Both the declared content type and the file's magic bytes are checked: the original
     * extension is never used.
     */
    public String storeImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("No image was uploaded");
        }
        if (file.getSize() > profilePictureMaxSize.toBytes()) {
            throw ApiException.badRequest("Image is too large (max " + profilePictureMaxSize + ")");
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType();
        contentType = contentType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        if ("image/jpg".equals(contentType)) {
            contentType = "image/jpeg";
        }
        String ext = IMAGE_EXTENSIONS.get(contentType);
        if (ext == null) {
            throw ApiException.badRequest("Only JPEG, PNG and WebP images are allowed");
        }

        final byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Could not read image", e);
        }
        if (!hasImageSignature(contentType, bytes)) {
            throw ApiException.badRequest("The file content does not match its image type");
        }

        String stored = UUID.randomUUID() + "." + ext;
        try {
            Files.write(root.resolve(stored), bytes);
        } catch (IOException e) {
            throw new IllegalStateException("Could not store image", e);
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

    /** Turns a stored file name into the public path returned by the API. */
    public String profilePictureUrl(String storedName) {
        return storedName == null ? null : PROFILE_PICTURE_PREFIX + storedName;
    }

    /** Deletes the file behind a stored profile-picture URL (no-op when there is none). */
    public void deleteProfilePicture(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        String stored = url.contains("/") ? url.substring(url.lastIndexOf('/') + 1) : url;
        delete(stored);
    }

    /** Content type used when serving a stored profile picture. */
    public String imageContentType(String storedName) {
        String ext = storedName.contains(".")
                ? storedName.substring(storedName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT)
                : "";
        return switch (ext) {
            case "jpg" -> "image/jpeg";
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            default -> "application/octet-stream";
        };
    }

    private static boolean hasImageSignature(String contentType, byte[] bytes) {
        return switch (contentType) {
            case "image/jpeg" -> bytes.length >= 3
                    && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF;
            case "image/png" -> bytes.length >= 8
                    && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G'
                    && bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A;
            case "image/webp" -> bytes.length >= 12
                    && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                    && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
            default -> false;
        };
    }
}
