package com.flowlyrent.repository;

import com.flowlyrent.model.LinenTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LinenTemplateRepository extends JpaRepository<LinenTemplate, Long> {
    List<LinenTemplate> findByUserIdOrderByNameAsc(Long userId);
    Optional<LinenTemplate> findByIdAndUserId(Long id, Long userId);
}
