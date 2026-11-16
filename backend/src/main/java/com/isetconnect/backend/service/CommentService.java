package com.isetconnect.backend.service;

import com.isetconnect.backend.dto.CommentRequest;
import com.isetconnect.backend.dto.CommentResponse;
import com.isetconnect.backend.dto.PageResponse;
import com.isetconnect.backend.exception.ApiException;
import com.isetconnect.backend.model.Comment;
import com.isetconnect.backend.model.Publication;
import com.isetconnect.backend.model.Role;
import com.isetconnect.backend.model.User;
import com.isetconnect.backend.repository.CommentRepository;
import com.isetconnect.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository comments;
    private final UserRepository users;
    private final PublicationService publicationService;

    @Transactional(readOnly = true)
    public PageResponse<CommentResponse> list(Long publicationId, User current, Pageable pageable) {
        publicationService.getAccessible(publicationId, current);
        return PageResponse.of(comments.findByPublicationId(publicationId, pageable).map(CommentResponse::from));
    }

    @Transactional
    public CommentResponse add(Long publicationId, User current, CommentRequest req) {
        Publication p = publicationService.getAccessible(publicationId, current);
        Comment c = new Comment();
        c.setContent(req.content().trim());
        c.setPublication(p);
        c.setAuthor(users.getReferenceById(current.getId()));
        return CommentResponse.from(comments.save(c));
    }

    @Transactional
    public CommentResponse update(Long id, User current, CommentRequest req) {
        Comment c = find(id);
        if (!c.getAuthor().getId().equals(current.getId())) {
            throw ApiException.forbidden("Only the author can edit this comment");
        }
        c.setContent(req.content().trim());
        return CommentResponse.from(comments.save(c));
    }

    @Transactional
    public void delete(Long id, User current) {
        Comment c = find(id);
        boolean allowed = c.getAuthor().getId().equals(current.getId())
                || current.getRole() == Role.ADMIN
                || c.getPublication().getAuthor().getId().equals(current.getId());
        if (!allowed) {
            throw ApiException.forbidden("You cannot delete this comment");
        }
        comments.delete(c);
    }

    private Comment find(Long id) {
        return comments.findById(id).orElseThrow(() -> ApiException.notFound("Comment not found"));
    }
}
