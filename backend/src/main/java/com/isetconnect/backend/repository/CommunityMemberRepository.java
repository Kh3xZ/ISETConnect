package com.isetconnect.backend.repository;

import com.isetconnect.backend.model.Community;
import com.isetconnect.backend.model.CommunityMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommunityMemberRepository extends JpaRepository<CommunityMember, Long> {

    boolean existsByCommunityIdAndUserId(Long communityId, Long userId);

    long countByCommunityId(Long communityId);

    Optional<CommunityMember> findByCommunityIdAndUserId(Long communityId, Long userId);

    @EntityGraph(attributePaths = "user")
    Page<CommunityMember> findByCommunityId(Long communityId, Pageable pageable);

    @Query("select m.community from CommunityMember m where m.user.id = :userId order by m.joinedAt desc")
    List<Community> findCommunitiesByUserId(@Param("userId") Long userId);
}
