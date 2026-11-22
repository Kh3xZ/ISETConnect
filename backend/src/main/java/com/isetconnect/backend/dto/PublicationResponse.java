package com.isetconnect.backend.dto;

import com.isetconnect.backend.model.Publication;

import java.time.Instant;

public record PublicationResponse(Long id, String title, String content, UserSummary author,
                                  Long communityId, String communityName,
                                  long commentsCount, long likesCount, boolean liked,
                                  Instant createdAt, Instant updatedAt) {

    public static PublicationResponse from(Publication p, long commentsCount, long likesCount, boolean liked) {
        return new PublicationResponse(
                p.getId(), p.getTitle(), p.getContent(), UserSummary.from(p.getAuthor()),
                p.getCommunity() == null ? null : p.getCommunity().getId(),
                p.getCommunity() == null ? null : p.getCommunity().getName(),
                commentsCount, likesCount, liked, p.getCreatedAt(), p.getUpdatedAt());
    }
}
