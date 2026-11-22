package com.isetconnect.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;





@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.JOINED)
@Getter
@Setter
@NoArgsConstructor
public abstract class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nom_prenom", nullable = false, length = 120)
    private String nomPrenom;

    @Column(nullable = false, unique = true, length = 160)
    private String email;


    @Column(nullable = false)
    private String password;


    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private Department department;

    /** Public path of the profile picture, e.g. /api/profile-pictures/<uuid>.png. */
    @Column(name = "profile_picture_url", length = 512)
    private String profilePictureUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public abstract Role getRole();
}
