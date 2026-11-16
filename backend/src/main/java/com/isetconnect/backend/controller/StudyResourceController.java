package com.isetconnect.backend.controller;

import com.isetconnect.backend.dto.PageResponse;
import com.isetconnect.backend.dto.ResourceRequest;
import com.isetconnect.backend.dto.ResourceResponse;
import com.isetconnect.backend.model.User;
import com.isetconnect.backend.service.StudyResourceService;
import com.isetconnect.backend.util.PageUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;





@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class StudyResourceController {

    private final StudyResourceService resourceService;

    @GetMapping
    public PageResponse<ResourceResponse> list(@RequestParam(required = false) String module,
                                               @RequestParam(required = false) String q,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return resourceService.list(module, q, PageUtil.newestFirst(page, size));
    }

    @GetMapping("/modules")
    public List<String> modules() {
        return resourceService.modules();
    }

    @GetMapping("/{id}")
    public ResourceResponse get(@PathVariable Long id) {
        return resourceService.get(id);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        StudyResourceService.Download d = resourceService.download(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(d.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(d.fileName(), StandardCharsets.UTF_8).build().toString())
                .body(d.resource());
    }


    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResourceResponse> create(@AuthenticationPrincipal User current,
                                                   @RequestParam("title") String title,
                                                   @RequestParam(value = "description", required = false) String description,
                                                   @RequestParam(value = "module", required = false) String module,
                                                   @RequestParam(value = "file", required = false) MultipartFile file) {
        if (title == null || title.isBlank()) {
            throw com.isetconnect.backend.exception.ApiException.badRequest("title is required");
        }
        ResourceRequest req = new ResourceRequest(title, description, module);
        return ResponseEntity.status(HttpStatus.CREATED).body(resourceService.create(current, req, file));
    }

    @PutMapping("/{id}")
    public ResourceResponse update(@AuthenticationPrincipal User current, @PathVariable Long id,
                                   @Valid @RequestBody ResourceRequest req) {
        return resourceService.update(id, current, req);
    }


    @PostMapping(value = "/{id}/attachment", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResourceResponse replaceAttachment(@AuthenticationPrincipal User current, @PathVariable Long id,
                                              @RequestParam("file") MultipartFile file) {
        return resourceService.replaceAttachment(id, current, file);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User current, @PathVariable Long id) {
        resourceService.delete(id, current);
        return ResponseEntity.noContent().build();
    }
}
