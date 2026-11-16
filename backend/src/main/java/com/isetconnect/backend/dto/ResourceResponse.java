package com.isetconnect.backend.dto;

import com.isetconnect.backend.model.StudyResource;

import java.time.Instant;

public record ResourceResponse(Long id, String title, String description, String module,
                               boolean hasAttachment, String attachmentName, String downloadUrl,
                               UserSummary uploader, Instant createdAt) {

    public static ResourceResponse from(StudyResource r) {
        boolean has = r.getAttachment() != null;
        return new ResourceResponse(r.getId(), r.getTitle(), r.getDescription(), r.getModule(),
                has, r.getAttachmentName(), has ? "/api/resources/" + r.getId() + "/download" : null,
                UserSummary.from(r.getUploader()), r.getCreatedAt());
    }
}
