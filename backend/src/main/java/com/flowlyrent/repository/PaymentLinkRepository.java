package com.flowlyrent.repository;

import com.flowlyrent.model.PaymentLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentLinkRepository extends JpaRepository<PaymentLink, Long> {
    Optional<PaymentLink> findByToken(String token);
}
