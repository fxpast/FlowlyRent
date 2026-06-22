package com.flowlyrent.repository;

import com.flowlyrent.model.LocalEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LocalEventRepository extends JpaRepository<LocalEvent, Long> {
    List<LocalEvent> findByUserIdOrderByStartDateAsc(Long userId);
    void deleteByZoneId(Long zoneId);
}
