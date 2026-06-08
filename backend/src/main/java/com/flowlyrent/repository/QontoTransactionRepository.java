package com.flowlyrent.repository;

import com.flowlyrent.model.QontoTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface QontoTransactionRepository extends JpaRepository<QontoTransaction, Long> {
    List<QontoTransaction> findByUserIdOrderBySettledAtDescEmittedAtDesc(Long userId);
    List<QontoTransaction> findByUserIdAndSettledAtBetweenOrderBySettledAtDesc(Long userId, LocalDate from, LocalDate to);
    Optional<QontoTransaction> findByUserIdAndQontoId(Long userId, String qontoId);
}
