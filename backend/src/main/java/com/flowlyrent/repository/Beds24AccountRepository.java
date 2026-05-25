package com.flowlyrent.repository;

import com.flowlyrent.model.Beds24Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface Beds24AccountRepository extends JpaRepository<Beds24Account, Long> {
    Optional<Beds24Account> findByAppUserId(Long userId);
    List<Beds24Account> findByConnectedTrue();
}
