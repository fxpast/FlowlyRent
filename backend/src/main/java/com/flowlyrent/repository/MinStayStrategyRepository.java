package com.flowlyrent.repository;

import com.flowlyrent.model.MinStayStrategy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MinStayStrategyRepository extends JpaRepository<MinStayStrategy, Long> {
    Optional<MinStayStrategy> findByUserId(Long userId);
    List<MinStayStrategy> findByEnabledTrue();
}
