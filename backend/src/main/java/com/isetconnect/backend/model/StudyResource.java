package com.isetconnect.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

@Entity
@Table(name = "study_resources")
@Getter
@Setter
@NoArgsConstructor
public class StudyResource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;


    @Column(length = 120)
    private String module;


    @Column(name = "attachment", length = 255)
    private String attachment;


    @Column(name = "attachment_name", length = 255)
    private String attachmentName;

    @Column(name = "attachment_content_type", length = 150)
    private String attachmentContentType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploader_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User uploader;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
