package com.isetconnect.backend.repository;

import com.isetconnect.backend.model.PublicationLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PublicationLikeRepository extends JpaRepository<PublicationLike, Long> {

    long countByPublicationId(Long publicationId);

    boolean existsByPublicationIdAndUserId(Long publicationId, Long userId);

    /** Idempotent insert: two simultaneous taps (or a retry) can never create a duplicate or throw. */
    @Modifying
    @Query(value = """
            insert into publication_likes (publication_id, user_id, created_at)
            values (:publicationId, :userId, now())
            on conflict (publication_id, user_id) do nothing
            """, nativeQuery = true)
    void insertIfAbsent(@Param("publicationId") Long publicationId, @Param("userId") Long userId);

    @Modifying
    @Query("delete from PublicationLike l where l.publication.id = :publicationId and l.user.id = :userId")
    void deleteByPublicationAndUser(@Param("publicationId") Long publicationId, @Param("userId") Long userId);

    /** Batch: [publicationId, count] rows for a whole page of posts (avoids one query per post). */
    @Query("select l.publication.id, count(l) from PublicationLike l where l.publication.id in :ids group by l.publication.id")
    List<Object[]> countByPublicationIds(@Param("ids") Collection<Long> ids);

    /** Batch: which of these posts did this user like? */
    @Query("select l.publication.id from PublicationLike l where l.user.id = :userId and l.publication.id in :ids")
    List<Long> findLikedPublicationIds(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);
}
