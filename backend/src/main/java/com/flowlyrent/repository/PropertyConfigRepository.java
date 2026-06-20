package com.flowlyrent.repository;

import com.flowlyrent.model.PropertyConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PropertyConfigRepository extends JpaRepository<PropertyConfig, Long> {
    List<PropertyConfig> findByUserId(Long userId);
    Optional<PropertyConfig> findByUserIdAndBeds24PropertyId(Long userId, String beds24PropertyId);
    List<PropertyConfig> findByKeyBoxId(Long keyBoxId);
    /** Mode channel manager : configs Beds24 uniquement (sans pont iCal). */
    List<PropertyConfig> findByUserIdAndLocalPropertyIdIsNull(Long userId);
    /** Mode iCal : configs qui sont le pont d'un LocalProperty. */
    List<PropertyConfig> findByUserIdAndLocalPropertyIdIsNotNull(Long userId);
    Optional<PropertyConfig> findByLocalPropertyId(Long localPropertyId);
}
