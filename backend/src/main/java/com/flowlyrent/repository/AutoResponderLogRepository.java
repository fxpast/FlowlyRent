package com.flowlyrent.repository;

import com.flowlyrent.model.AutoResponderLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AutoResponderLogRepository extends JpaRepository<AutoResponderLog, Long> {
    boolean existsByUserIdAndBeds24MessageId(Long userId, String beds24MessageId);
    List<AutoResponderLog> findByUserIdOrderByCreatedAtDesc(Long userId);
}
