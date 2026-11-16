package com.isetconnect.backend.dto;

import com.isetconnect.backend.model.CommunityMember;

import java.time.Instant;

public record MemberResponse(UserSummary user, Instant joinedAt) {

    public static MemberResponse from(CommunityMember m) {
        return new MemberResponse(UserSummary.from(m.getUser()), m.getJoinedAt());
    }
}
