package com.flowlyrent.repository;

import com.flowlyrent.model.PropertyInventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyInventoryItemRepository extends JpaRepository<PropertyInventoryItem, Long> {
    List<PropertyInventoryItem> findByUserIdAndBeds24PropertyIdOrderByCategoryAscSortOrderAscIdAsc(
            Long userId, String beds24PropertyId);
    void deleteByUserIdAndBeds24PropertyId(Long userId, String beds24PropertyId);
}
