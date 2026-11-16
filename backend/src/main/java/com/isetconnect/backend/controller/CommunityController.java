package com.isetconnect.backend.controller;

import com.isetconnect.backend.dto.*;
import com.isetconnect.backend.model.User;
import com.isetconnect.backend.service.CommunityService;
import com.isetconnect.backend.util.PageUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/communities")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    @GetMapping
    public PageResponse<CommunityResponse> list(@AuthenticationPrincipal User current,
                                                @RequestParam(required = false) String q,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        return communityService.list(current, q, PageUtil.of(page, size, Sort.by("name")));
    }


    @GetMapping("/mine")
    public List<CommunityResponse> mine(@AuthenticationPrincipal User current) {
        return communityService.mine(current);
    }

    @PostMapping
    public ResponseEntity<CommunityResponse> create(@AuthenticationPrincipal User current,
                                                    @Valid @RequestBody CommunityRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(communityService.create(current, req));
    }

    @GetMapping("/{id}")
    public CommunityResponse get(@AuthenticationPrincipal User current, @PathVariable Long id) {
        return communityService.get(id, current);
    }

    @PutMapping("/{id}")
    public CommunityResponse update(@AuthenticationPrincipal User current, @PathVariable Long id,
                                    @Valid @RequestBody CommunityRequest req) {
        return communityService.update(id, current, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User current, @PathVariable Long id) {
        communityService.delete(id, current);
        return ResponseEntity.noContent().build();
    }


    @PostMapping("/{id}/join")
    public CommunityResponse join(@AuthenticationPrincipal User current, @PathVariable Long id,
                                  @RequestBody(required = false) JoinRequest req) {
        return communityService.join(id, current, req);
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<Void> leave(@AuthenticationPrincipal User current, @PathVariable Long id) {
        communityService.leave(id, current);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/members")
    public PageResponse<MemberResponse> members(@AuthenticationPrincipal User current, @PathVariable Long id,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "50") int size) {
        return communityService.listMembers(id, current, CommunityService.membersPage(page, size));
    }
}
