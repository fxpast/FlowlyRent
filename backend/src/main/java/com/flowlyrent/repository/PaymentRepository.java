package com.flowlyrent.repository;

import com.flowlyrent.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByBookingId(Long bookingId);
    Optional<Payment> findByStripePaymentIntentId(String paymentIntentId);
    Optional<Payment> findByStripeCheckoutSessionId(String sessionId);
}
