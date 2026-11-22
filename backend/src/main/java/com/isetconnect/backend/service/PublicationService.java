package com.isetconnect.backend.service;

import com.isetconnect.backend.dto.PageResponse;
import com.isetconnect.backend.dto.LikeResponse;
import com.isetconnect.backend.dto.PublicationRequest;
import com.isetconnect.backend.dto.PublicationResponse;
import com.isetconnect.backend.exception.ApiException;
import com.isetconnect.backend.model.Community;
import com.isetconnect.backend.model.Department;
import com.isetconnect.backend.model.Publication;
import com.isetconnect.backend.model.Role;
import com.isetconnect.backend.model.User;
import com.isetconnect.backend.repository.CommentRepository;
import com.isetconnect.backend.repository.PublicationLikeRepository;
import com.isetconnect.backend.repository.PublicationRepository;
import com.isetconnect.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PublicationService {

    private final PublicationRepository publications;
    private final CommentRepository comments;
    private final PublicationLikeRepository likes;
    private final UserRepository users;
    private final CommunityService communityService;

    @Transactional(readOnly = true)
    public PageResponse<PublicationResponse> feed(User current, Long communityId, String department, Pageable pageable) {
        Page<Publication> page;
        if (communityId != null) {
            communityService.assertCanView(communityService.getEntity(communityId), current);
            page = publications.findByCommunityId(communityId, pageable);
        } else if (department != null && !department.isBlank()) {
            Department d;
            try {
                d = Department.valueOf(department.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("Unknown department: " + department);
            }
            page = publications.findFeedByDepartment(current.getId(), d, pageable);
        } else {
            page = publications.findFeed(current.getId(), pageable);
        }
        return PageResponse.of(toResponses(page, current));
    }

    @Transactional(readOnly = true)
    public PageResponse<PublicationResponse> byAuthor(Long authorId, User viewer, Pageable pageable) {
        Page<Publication> page = publications.findVisibleByAuthor(authorId, viewer.getId(), pageable);
        return PageResponse.of(toResponses(page, viewer));
    }

    @Transactional(readOnly = true)
    public PublicationResponse get(Long id, User current) {
        return toResponse(getAccessible(id, current), current);
    }

    @Transactional
    public LikeResponse like(Long id, User current) {
        Publication publication = getAccessible(id, current);
        likes.insertIfAbsent(publication.getId(), current.getId());
        return new LikeResponse(true, likes.countByPublicationId(publication.getId()));
    }

    @Transactional
    public LikeResponse unlike(Long id, User current) {
        Publication publication = getAccessible(id, current);
        likes.deleteByPublicationAndUser(publication.getId(), current.getId());
        return new LikeResponse(false, likes.countByPublicationId(publication.getId()));
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
        return toResponse(publications.save(p), current);
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
        return toResponse(publications.save(p), current);
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

    private Page<PublicationResponse> toResponses(Page<Publication> page, User current) {
        List<Long> ids = page.getContent().stream().map(Publication::getId).toList();
        Map<Long, Long> likeCounts = new HashMap<>();
        Set<Long> likedIds = new HashSet<>();
        if (!ids.isEmpty()) {
            for (Object[] row : likes.countByPublicationIds(ids)) {
                likeCounts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
            }
            likedIds.addAll(likes.findLikedPublicationIds(current.getId(), ids));
        }
        return page.map(p -> PublicationResponse.from(
                p,
                comments.countByPublicationId(p.getId()),
                likeCounts.getOrDefault(p.getId(), 0L),
                likedIds.contains(p.getId())));
    }

    private PublicationResponse toResponse(Publication p, User current) {
        return PublicationResponse.from(
                p,
                comments.countByPublicationId(p.getId()),
                likes.countByPublicationId(p.getId()),
                likes.existsByPublicationIdAndUserId(p.getId(), current.getId()));
    }
}
