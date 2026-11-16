package com.isetconnect.backend.service;

import com.isetconnect.backend.dto.PageResponse;
import com.isetconnect.backend.dto.PublicationRequest;
import com.isetconnect.backend.dto.PublicationResponse;
import com.isetconnect.backend.exception.ApiException;
import com.isetconnect.backend.model.Community;
import com.isetconnect.backend.model.Publication;
import com.isetconnect.backend.model.Role;
import com.isetconnect.backend.model.User;
import com.isetconnect.backend.repository.CommentRepository;
import com.isetconnect.backend.repository.PublicationRepository;
import com.isetconnect.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class PublicationService {

    private final PublicationRepository publications;
    private final CommentRepository comments;
    private final UserRepository users;
    private final CommunityService communityService;

    @Transactional(readOnly = true)
    public PageResponse<PublicationResponse> feed(User current, Long communityId, Pageable pageable) {
        Page<Publication> page;
        if (communityId != null) {
            communityService.assertCanView(communityService.getEntity(communityId), current);
            page = publications.findByCommunityId(communityId, pageable);
        } else {
            page = publications.findFeed(current.getId(), pageable);
        }
        return PageResponse.of(page.map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public PageResponse<PublicationResponse> byAuthor(Long authorId, User viewer, Pageable pageable) {
        return PageResponse.of(publications.findVisibleByAuthor(authorId, viewer.getId(), pageable)
                .map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public PublicationResponse get(Long id, User current) {
        return toResponse(getAccessible(id, current));
    }

    @Transactional
    public PublicationResponse create(User current, PublicationRequest req) {
        Publication p = new Publication();
        p.setTitle(req.title().trim());
        p.setContent(req.content().trim());
        p.setAuthor(users.getReferenceById(current.getId()));
        if (req.communityId() != null) {
            Community c = communityService.getEntity(req.communityId());
            communityService.assertMember(c, current);
            p.setCommunity(c);
        }
        return toResponse(publications.save(p));
    }

    @Transactional
    public PublicationResponse update(Long id, User current, PublicationRequest req) {
        Publication p = getAccessible(id, current);
        if (!p.getAuthor().getId().equals(current.getId()) && current.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Only the author can edit this publication");
        }
        p.setTitle(req.title().trim());
        p.setContent(req.content().trim());
        p.setUpdatedAt(Instant.now());
        return toResponse(publications.save(p));
    }

    @Transactional
    public void delete(Long id, User current) {
        Publication p = getAccessible(id, current);
        boolean allowed = p.getAuthor().getId().equals(current.getId())
                || current.getRole() == Role.ADMIN
                || (p.getCommunity() != null && communityService.isOwnerOrAdmin(p.getCommunity(), current));
        if (!allowed) {
            throw ApiException.forbidden("You cannot delete this publication");
        }
        publications.delete(p);
    }


    public Publication getAccessible(Long id, User current) {
        Publication p = publications.findById(id)
                .orElseThrow(() -> ApiException.notFound("Publication not found"));
        if (p.getCommunity() != null) {
            communityService.assertCanView(p.getCommunity(), current);
        }
        return p;
    }

    private PublicationResponse toResponse(Publication p) {
        return PublicationResponse.from(p, comments.countByPublicationId(p.getId()));
    }
}
