package com.flowlyrent.repository;

import com.flowlyrent.model.FaqItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FaqRepository extends JpaRepository<FaqItem, Long> {
    List<FaqItem> findAllByOrderByDisplayOrderAscCreatedAtAsc();
}
