package com.flowlyrent.repository;

import com.flowlyrent.model.PricingEventImpactConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PricingEventImpactConfigRepository extends JpaRepository<PricingEventImpactConfig, Long> {
    Optional<PricingEventImpactConfig> findByUserId(Long userId);
}
