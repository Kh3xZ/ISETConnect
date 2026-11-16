package com.isetconnect.backend.repository;

import com.isetconnect.backend.model.Community;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityRepository extends JpaRepository<Community, Long> {

    boolean existsByNameIgnoreCase(String name);

    Page<Community> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
