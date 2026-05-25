package com.flowlyrent.repository;

import com.flowlyrent.model.ExpenseRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpenseRuleRepository extends JpaRepository<ExpenseRule, Long> {
    List<ExpenseRule> findByUserIdAndActiveTrue(Long userId);
    List<ExpenseRule> findByUserIdAndCategoryAndActiveTrue(Long userId, String category);
}
