package com.isetconnect.backend.controller;

import com.isetconnect.backend.dto.*;
import com.isetconnect.backend.model.Department;
import com.isetconnect.backend.model.User;
import com.isetconnect.backend.service.PublicationService;
import com.isetconnect.backend.service.UserService;
import com.isetconnect.backend.util.PageUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PublicationService publicationService;

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal User current) {
        return UserResponse.from(current);
    }

    @PutMapping("/me")
    public UserResponse updateMe(@AuthenticationPrincipal User current,
                                 @Valid @RequestBody UpdateProfileRequest req) {
        return userService.updateMe(current, req);
    }

    @PostMapping(value = "/me/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse uploadProfilePicture(@AuthenticationPrincipal User current,
                                             @RequestParam("file") MultipartFile file) {
        return userService.updateProfilePicture(current, file);
    }

    @DeleteMapping("/me/profile-picture")
    public UserResponse removeProfilePicture(@AuthenticationPrincipal User current) {
        return userService.removeProfilePicture(current);
    }

    @GetMapping
    public PageResponse<UserResponse> search(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) Department department,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return userService.search(q, department, PageUtil.of(page, size, Sort.by("nomPrenom")));
    }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable Long id) {
        return userService.getById(id);
    }

    @GetMapping("/{id}/publications")
    public PageResponse<PublicationResponse> publicationsOf(@AuthenticationPrincipal User current,
                                                            @PathVariable Long id,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "20") int size) {
        return publicationService.byAuthor(id, current, PageUtil.newestFirst(page, size));
    }
}
