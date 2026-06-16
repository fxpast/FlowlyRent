package com.flowlyrent.repository;

import com.flowlyrent.model.PropertyConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PropertyConfigRepository extends JpaRepository<PropertyConfig, Long> {
    List<PropertyConfig> findByUserId(Long userId);
    Optional<PropertyConfig> findByUserIdAndBeds24PropertyId(Long userId, String beds24PropertyId);
    List<PropertyConfig> findByKeyBoxId(Long keyBoxId);
}
