package com.flowlyrent.repository;

import com.flowlyrent.model.ManualExpense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ManualExpenseRepository extends JpaRepository<ManualExpense, Long> {
    List<ManualExpense> findByUserIdAndYearAndMonthOrderByLabelAsc(Long userId, int year, int month);
}
