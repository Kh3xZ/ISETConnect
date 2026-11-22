package com.isetconnect.backend.repository;

import com.isetconnect.backend.model.Department;
import com.isetconnect.backend.model.Publication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PublicationRepository extends JpaRepository<Publication, Long> {





    @EntityGraph(attributePaths = {"author", "community"})
    @Query("""
            select p from Publication p left join p.community c
            where c is null or c.isPrivate = false
               or exists (select 1 from CommunityMember m where m.community = c and m.user.id = :userId)
            """)
    Page<Publication> findFeed(@Param("userId") Long userId, Pageable pageable);


    /** Feed filtered on the author's department ("My Department" tab). */
    @EntityGraph(attributePaths = {"author", "community"})
    @Query("""
            select p from Publication p left join p.community c
            where p.author.department = :department
              and (c is null or c.isPrivate = false
                   or exists (select 1 from CommunityMember m where m.community = c and m.user.id = :userId))
            """)
    Page<Publication> findFeedByDepartment(@Param("userId") Long userId,
                                           @Param("department") Department department,
                                           Pageable pageable);

    @EntityGraph(attributePaths = {"author", "community"})
    @Query("""
            select p from Publication p left join p.community c
            where p.author.id = :authorId
              and (c is null or c.isPrivate = false
                   or exists (select 1 from CommunityMember m where m.community = c and m.user.id = :viewerId))
            """)
    Page<Publication> findVisibleByAuthor(@Param("authorId") Long authorId,
                                          @Param("viewerId") Long viewerId,
                                          Pageable pageable);

    @EntityGraph(attributePaths = {"author", "community"})
    Page<Publication> findByCommunityId(Long communityId, Pageable pageable);
}
