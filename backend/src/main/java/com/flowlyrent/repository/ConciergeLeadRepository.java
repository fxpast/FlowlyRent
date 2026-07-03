package com.flowlyrent.repository;

import com.flowlyrent.model.ConciergeLead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConciergeLeadRepository extends JpaRepository<ConciergeLead, Long> {
    List<ConciergeLead> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<ConciergeLead> findByIdAndUserId(Long id, Long userId);
    long countByUserIdAndStatus(Long userId, com.flowlyrent.model.enums.ConciergeLeadStatus status);
}
