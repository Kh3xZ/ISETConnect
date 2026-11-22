package com.isetconnect.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

/** One row = one user liking one publication. The unique constraint makes a double-like impossible. */
@Entity
@Table(name = "publication_likes",
        uniqueConstraints = @UniqueConstraint(name = "uk_publication_like_user", columnNames = {"publication_id", "user_id"}),
        indexes = @Index(name = "idx_publication_like_user", columnList = "user_id"))
@Getter
@Setter
@NoArgsConstructor
public class PublicationLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "publication_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Publication publication;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
