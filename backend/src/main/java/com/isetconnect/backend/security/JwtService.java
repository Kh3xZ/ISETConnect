package com.isetconnect.backend.security;

import com.isetconnect.backend.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(User user) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }


    public Long extractUserId(String token) {
        Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        return Long.valueOf(claims.getSubject());
    }

    private static final String DOWNLOAD_SUBJECT = "resource-download";
    private static final long DOWNLOAD_TTL_MS = 5 * 60 * 1000L;

    /**
     * Short-lived (5 min) token that only authorises downloading ONE resource file.
     * Lets a phone open the file in its browser, which cannot send the Authorization header.
     * It can never be used to authenticate: its subject is not a user id.
     */
    public String generateDownloadToken(Long resourceId) {
        Date now = new Date();
        return Jwts.builder()
                .subject(DOWNLOAD_SUBJECT)
                .claim("resourceId", resourceId)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + DOWNLOAD_TTL_MS))
                .signWith(key)
                .compact();
    }

    public boolean isValidDownloadToken(String token, Long resourceId) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            Number id = claims.get("resourceId", Number.class);
            return DOWNLOAD_SUBJECT.equals(claims.getSubject()) && id != null && id.longValue() == resourceId;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
