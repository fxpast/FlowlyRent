package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Dépense mensuelle saisie manuellement par l'utilisateur (non extractible de Qonto),
 * rattachée ou non à un logement, prise en compte dans le calcul de la marge.
 */
@Entity
@Table(name = "manual_expenses")
@Data
public class ManualExpense {

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

    // null = charge globale, sinon = ID propriété Beds24
    private String beds24PropertyId;

    @Column(nullable = false)
    private int year;

    @Column(nullable = false)
    private int month;

    // true = charge récurrente, appliquée chaque mois à partir de year/month
    private boolean recurring = false;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
