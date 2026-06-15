package com.flowlyrent.repository;

import com.flowlyrent.model.FaqSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FaqSuggestionRepository extends JpaRepository<FaqSuggestion, Long> {
    List<FaqSuggestion> findAllByOrderByCreatedAtDesc();
}
