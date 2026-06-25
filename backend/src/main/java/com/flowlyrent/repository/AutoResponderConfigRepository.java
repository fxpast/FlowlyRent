package com.flowlyrent.repository;

import com.flowlyrent.model.AutoResponderConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AutoResponderConfigRepository extends JpaRepository<AutoResponderConfig, Long> {
    Optional<AutoResponderConfig> findByUserId(Long userId);
}
