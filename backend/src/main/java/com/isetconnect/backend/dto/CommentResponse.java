package com.isetconnect.backend.dto;

import com.isetconnect.backend.model.Comment;

import java.time.Instant;

public record CommentResponse(Long id, String content, UserSummary author, Long publicationId, Instant createdAt) {

    public static CommentResponse from(Comment c) {
        return new CommentResponse(c.getId(), c.getContent(), UserSummary.from(c.getAuthor()),
                c.getPublication().getId(), c.getCreatedAt());
    }
}
