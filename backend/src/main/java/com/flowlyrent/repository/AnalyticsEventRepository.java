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

    long countByTypeAndCreatedAtAfter(AnalyticsEventType type, LocalDateTime after);

    @Query(value = "SELECT page, COUNT(*) as cnt FROM analytics_events WHERE type = :type AND created_at > :after AND page IS NOT NULL GROUP BY page ORDER BY cnt DESC", nativeQuery = true)
    List<Object[]> findTopPages(@Param("type") String type, @Param("after") LocalDateTime after, Pageable pageable);

    @Query(value = "SELECT DATE(created_at) as day, COUNT(*) as cnt FROM analytics_events WHERE type = :type AND created_at > :after GROUP BY DATE(created_at) ORDER BY day", nativeQuery = true)
    List<Object[]> findDailyStats(@Param("type") String type, @Param("after") LocalDateTime after);
}
