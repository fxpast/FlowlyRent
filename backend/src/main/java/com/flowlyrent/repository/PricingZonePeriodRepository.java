package com.flowlyrent.repository;

import com.flowlyrent.model.PricingZonePeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PricingZonePeriodRepository extends JpaRepository<PricingZonePeriod, Long> {
    List<PricingZonePeriod> findByZoneId(Long zoneId);
    void deleteByZoneId(Long zoneId);
}
