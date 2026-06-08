package com.flowlyrent.repository;

import com.flowlyrent.model.QontoAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface QontoAccountRepository extends JpaRepository<QontoAccount, Long> {
    Optional<QontoAccount> findByAppUserId(Long userId);

    @Query("SELECT a.appUser.id FROM QontoAccount a WHERE a.connected = true AND a.login IS NOT NULL AND a.secretKey IS NOT NULL")
    List<Long> findUserIdsWithConnectedAccounts();
}
