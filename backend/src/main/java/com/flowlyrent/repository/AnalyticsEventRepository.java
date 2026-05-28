package com.flowlyrent.repository;

import com.flowlyrent.model.AnalyticsEvent;
import com.flowlyrent.model.enums.AnalyticsEventType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, Long> {

    @Query("SELECT COUNT(e) FROM AnalyticsEvent e WHERE e.type = :type AND e.createdAt > :after AND (e.userId IS NULL OR e.userId NOT IN :excludeIds)")
    long countByTypeAndCreatedAtAfterExcluding(@Param("type") AnalyticsEventType type, @Param("after") LocalDateTime after, @Param("excludeIds") List<Long> excludeIds);

    @Query("SELECT COUNT(e) FROM AnalyticsEvent e WHERE e.type = :type AND e.userId IS NULL AND e.createdAt > :after")
    long countAnonymousByTypeAndCreatedAtAfter(@Param("type") AnalyticsEventType type, @Param("after") LocalDateTime after);

    @Query(value = "SELECT page, COUNT(*) as cnt FROM analytics_events WHERE type = :type AND created_at > :after AND page IS NOT NULL AND (user_id IS NULL OR user_id NOT IN :excludeIds) GROUP BY page ORDER BY cnt DESC", nativeQuery = true)
    List<Object[]> findTopPagesExcluding(@Param("type") String type, @Param("after") LocalDateTime after, @Param("excludeIds") List<Long> excludeIds, Pageable pageable);

    @Query(value = "SELECT DATE(created_at) as day, COUNT(*) as cnt FROM analytics_events WHERE type = :type AND created_at > :after AND (user_id IS NULL OR user_id NOT IN :excludeIds) GROUP BY DATE(created_at) ORDER BY day", nativeQuery = true)
    List<Object[]> findDailyStatsExcluding(@Param("type") String type, @Param("after") LocalDateTime after, @Param("excludeIds") List<Long> excludeIds);
}
