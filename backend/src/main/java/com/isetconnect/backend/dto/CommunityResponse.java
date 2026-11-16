package com.isetconnect.backend.dto;

import java.time.Instant;


public record CommunityResponse(Long id, String name, String description, Boolean isPrivate,
                                Integer nbMax, long membersCount, boolean joined,
                                Long ownerId, Instant createdAt) {
}
