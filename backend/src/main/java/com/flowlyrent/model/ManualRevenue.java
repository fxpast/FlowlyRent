package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "manual_revenues")
@Data
public class ManualRevenue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    // null = global, sinon = ID propriété Beds24 (ou LocalProperty en mode iCal)
    private String beds24PropertyId;

    @Column(nullable = false)
    private int year;

    @Column(nullable = false)
    private int month;

    // true = revenu récurrent, appliqué chaque mois à partir de year/month
    private boolean recurring = false;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
