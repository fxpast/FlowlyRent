package com.flowlyrent.repository;

import com.flowlyrent.model.QontoAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface QontoAccountRepository extends JpaRepository<QontoAccount, Long> {
    Optional<QontoAccount> findByAppUserId(Long userId);
}
