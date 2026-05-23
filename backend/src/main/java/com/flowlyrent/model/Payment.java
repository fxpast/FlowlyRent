package com.flowlyrent.model;

import com.flowlyrent.model.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status = PaymentStatus.PENDING;

    private String stripePaymentIntentId;
    private String stripeChargeId;
    private String stripeCheckoutSessionId;
    private String currency = "EUR";

    private LocalDateTime paidAt;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
