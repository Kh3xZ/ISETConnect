package com.isetconnect.backend.controller;

import com.isetconnect.backend.dto.CreateUserRequest;
import com.isetconnect.backend.dto.PageResponse;
import com.isetconnect.backend.dto.UserResponse;
import com.isetconnect.backend.model.Department;
import com.isetconnect.backend.model.User;
import com.isetconnect.backend.service.UserService;
import com.isetconnect.backend.util.PageUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;

    @GetMapping
    public PageResponse<UserResponse> list(@RequestParam(required = false) String q,
                                           @RequestParam(required = false) Department department,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        return userService.search(q, department, PageUtil.newestFirst(page, size));
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.adminCreate(req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User current, @PathVariable Long id) {
        userService.adminDelete(id, current);
        return ResponseEntity.noContent().build();
    }
}
