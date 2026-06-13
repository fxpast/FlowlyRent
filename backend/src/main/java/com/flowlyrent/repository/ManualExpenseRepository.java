package com.flowlyrent.repository;

import com.flowlyrent.model.ManualExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ManualExpenseRepository extends JpaRepository<ManualExpense, Long> {

    // Charges ponctuelles du mois + charges récurrentes démarrées avant ou pendant ce mois
    @Query("SELECT m FROM ManualExpense m WHERE m.user.id = :userId AND " +
           "((m.recurring = false AND m.year = :year AND m.month = :month) " +
           "OR (m.recurring = true AND (m.year < :year OR (m.year = :year AND m.month <= :month)))) " +
           "ORDER BY m.label ASC")
    List<ManualExpense> findForPeriod(@Param("userId") Long userId, @Param("year") int year, @Param("month") int month);
}
