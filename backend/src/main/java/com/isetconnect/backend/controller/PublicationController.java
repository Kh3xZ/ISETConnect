package com.isetconnect.backend.controller;

import com.isetconnect.backend.dto.*;
import com.isetconnect.backend.model.User;
import com.isetconnect.backend.service.CommentService;
import com.isetconnect.backend.service.PublicationService;
import com.isetconnect.backend.util.PageUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PublicationController {

    private final PublicationService publicationService;
    private final CommentService commentService;




    @GetMapping("/publications")
    public PageResponse<PublicationResponse> feed(@AuthenticationPrincipal User current,
                                                  @RequestParam(required = false) Long communityId,
                                                  @RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "20") int size) {
        return publicationService.feed(current, communityId, PageUtil.newestFirst(page, size));
    }

    @GetMapping("/publications/{id}")
    public PublicationResponse get(@AuthenticationPrincipal User current, @PathVariable Long id) {
        return publicationService.get(id, current);
    }

    @PostMapping("/publications")
    public ResponseEntity<PublicationResponse> create(@AuthenticationPrincipal User current,
                                                      @Valid @RequestBody PublicationRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(publicationService.create(current, req));
    }

    @PutMapping("/publications/{id}")
    public PublicationResponse update(@AuthenticationPrincipal User current, @PathVariable Long id,
                                      @Valid @RequestBody PublicationRequest req) {
        return publicationService.update(id, current, req);
    }

    @DeleteMapping("/publications/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User current, @PathVariable Long id) {
        publicationService.delete(id, current);
        return ResponseEntity.noContent().build();
    }



    @GetMapping("/publications/{id}/comments")
    public PageResponse<CommentResponse> comments(@AuthenticationPrincipal User current, @PathVariable Long id,
                                                  @RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "20") int size) {
        return commentService.list(id, current,
                PageUtil.of(page, size, Sort.by(Sort.Direction.ASC, "createdAt")));
    }

    @PostMapping("/publications/{id}/comments")
    public ResponseEntity<CommentResponse> addComment(@AuthenticationPrincipal User current, @PathVariable Long id,
                                                      @Valid @RequestBody CommentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(commentService.add(id, current, req));
    }

    @PutMapping("/comments/{id}")
    public CommentResponse updateComment(@AuthenticationPrincipal User current, @PathVariable Long id,
                                         @Valid @RequestBody CommentRequest req) {
        return commentService.update(id, current, req);
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(@AuthenticationPrincipal User current, @PathVariable Long id) {
        commentService.delete(id, current);
        return ResponseEntity.noContent().build();
    }
}
