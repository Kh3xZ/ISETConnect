package com.isetconnect.backend.service;

import com.isetconnect.backend.dto.PageResponse;
import com.isetconnect.backend.dto.ResourceRequest;
import com.isetconnect.backend.dto.ResourceResponse;
import com.isetconnect.backend.exception.ApiException;
import com.isetconnect.backend.model.Role;
import com.isetconnect.backend.model.StudyResource;
import com.isetconnect.backend.model.User;
import com.isetconnect.backend.repository.StudyResourceRepository;
import com.isetconnect.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudyResourceService {

    public record Download(Resource resource, String fileName, String contentType) {}

    private final StudyResourceRepository resources;
    private final UserRepository users;
    private final FileStorageService storage;

    @Transactional(readOnly = true)
    public PageResponse<ResourceResponse> list(String module, String q, Pageable pageable) {
        return PageResponse.of(resources.search(pattern(module), pattern(q), pageable).map(ResourceResponse::from));
    }

    @Transactional(readOnly = true)
    public List<String> modules() {
        return resources.findDistinctModules();
    }

    @Transactional(readOnly = true)
    public ResourceResponse get(Long id) {
        return ResourceResponse.from(find(id));
    }

    @Transactional
    public ResourceResponse create(User current, ResourceRequest req, MultipartFile file) {
        StudyResource r = new StudyResource();
        r.setTitle(req.title().trim());
        r.setDescription(req.description());
        r.setModule(blankToNull(req.module()));
        r.setUploader(users.getReferenceById(current.getId()));
        if (file != null && !file.isEmpty()) {
            applyFile(r, file);
        }
        return ResourceResponse.from(resources.save(r));
    }

    @Transactional
    public ResourceResponse update(Long id, User current, ResourceRequest req) {
        StudyResource r = findOwned(id, current);
        r.setTitle(req.title().trim());
        r.setDescription(req.description());
        r.setModule(blankToNull(req.module()));
        return ResourceResponse.from(resources.save(r));
    }

    @Transactional
    public ResourceResponse replaceAttachment(Long id, User current, MultipartFile file) {
        StudyResource r = findOwned(id, current);
        String old = r.getAttachment();
        applyFile(r, file);
        resources.save(r);
        storage.delete(old);
        return ResourceResponse.from(r);
    }

    @Transactional
    public void delete(Long id, User current) {
        StudyResource r = findOwned(id, current);
        String stored = r.getAttachment();
        resources.delete(r);
        storage.delete(stored);
    }

    @Transactional(readOnly = true)
    public Download download(Long id) {
        StudyResource r = find(id);
        if (r.getAttachment() == null) {
            throw ApiException.notFound("This resource has no attachment");
        }
        String type = r.getAttachmentContentType() == null ? "application/octet-stream" : r.getAttachmentContentType();
        return new Download(storage.load(r.getAttachment()), r.getAttachmentName(), type);
    }



    private void applyFile(StudyResource r, MultipartFile file) {
        r.setAttachment(storage.store(file));
        r.setAttachmentName(file.getOriginalFilename() == null ? "attachment" : file.getOriginalFilename());
        r.setAttachmentContentType(file.getContentType());
    }

    private StudyResource find(Long id) {
        return resources.findById(id).orElseThrow(() -> ApiException.notFound("Resource not found"));
    }

    private StudyResource findOwned(Long id, User current) {
        StudyResource r = find(id);
        if (!r.getUploader().getId().equals(current.getId()) && current.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Only the uploader or an admin can modify this resource");
        }
        return r;
    }

    private static String pattern(String s) {
        return "%" + (s == null ? "" : s.trim().toLowerCase()) + "%";
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
