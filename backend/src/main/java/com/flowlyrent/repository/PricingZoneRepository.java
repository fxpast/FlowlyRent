package com.flowlyrent.repository;

import com.flowlyrent.model.PricingZone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PricingZoneRepository extends JpaRepository<PricingZone, Long> {
    List<PricingZone> findByUserId(Long userId);
}
