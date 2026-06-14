package com.flowlyrent.repository;

import com.flowlyrent.model.LinenItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LinenItemRepository extends JpaRepository<LinenItem, Long> {
    List<LinenItem> findByUserIdAndBeds24PropertyIdOrderBySortOrderAscLabelAsc(Long userId, String beds24PropertyId);
    Optional<LinenItem> findByIdAndUserId(Long id, Long userId);
    Optional<LinenItem> findByUserIdAndBeds24PropertyIdAndLabel(Long userId, String beds24PropertyId, String label);
}
