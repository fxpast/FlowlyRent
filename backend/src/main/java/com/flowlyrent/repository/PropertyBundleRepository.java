package com.flowlyrent.repository;

import com.flowlyrent.model.PropertyBundle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PropertyBundleRepository extends JpaRepository<PropertyBundle, Long> {
    List<PropertyBundle> findByUserId(Long userId);
    Optional<PropertyBundle> findByIdAndUserId(Long id, Long userId);
    List<PropertyBundle> findByEnabledTrue();
}
