package com.isetconnect.backend.repository;

import com.isetconnect.backend.model.StudyResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StudyResourceRepository extends JpaRepository<StudyResource, Long> {


    @EntityGraph(attributePaths = "uploader")
    @Query("""
            select r from StudyResource r
            where lower(coalesce(r.module, '')) like :modulePattern
              and (lower(r.title) like :textPattern
                   or lower(coalesce(r.description, '')) like :textPattern)
            """)
    Page<StudyResource> search(@Param("modulePattern") String modulePattern,
                               @Param("textPattern") String textPattern,
                               Pageable pageable);

    @Query("select distinct r.module from StudyResource r where r.module is not null order by r.module")
    List<String> findDistinctModules();
}
