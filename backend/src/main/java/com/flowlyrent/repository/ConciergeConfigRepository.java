package com.flowlyrent.repository;

import com.flowlyrent.model.ConciergeConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConciergeConfigRepository extends JpaRepository<ConciergeConfig, Long> {
    Optional<ConciergeConfig> findByUserId(Long userId);
}
