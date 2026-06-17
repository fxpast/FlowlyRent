package com.flowlyrent.repository;

import com.flowlyrent.model.LocalProperty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LocalPropertyRepository extends JpaRepository<LocalProperty, Long> {
    List<LocalProperty> findByUserIdOrderByCreatedAtAsc(Long userId);
    Optional<LocalProperty> findByIdAndUserId(Long id, Long userId);
    Optional<LocalProperty> findByIcalFeedToken(String token);
}
