package com.flowlyrent.repository;

import com.flowlyrent.model.PropertyPricingConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PropertyPricingConfigRepository extends JpaRepository<PropertyPricingConfig, Long> {
    List<PropertyPricingConfig> findByUserId(Long userId);
    Optional<PropertyPricingConfig> findByUserIdAndBeds24PropertyId(Long userId, String beds24PropertyId);
}
