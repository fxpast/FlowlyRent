package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "qonto_transactions")
@Data
public class QontoTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
                foreignKey = @ForeignKey(foreignKeyDefinition = "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"))
    private AppUser user;

    @Column(nullable = false)
    private String qontoId;

    private String label;
    private String counterpartyName;

    @Column(precision = 10, scale = 2)
    private BigDecimal amount;

    private String currency = "EUR";
    private String side;   // DEBIT, CREDIT

    private String status; // completed, pending, reversed, canceled

    private LocalDate settledAt;
    private LocalDate emittedAt;

    private String bankAccountIban;

    // Catégorisation automatique par règle
    private String category;
    private String ruleLabel;
    private Long expenseRuleId;
    private String beds24PropertyId;

    private String userNote;

    @CreationTimestamp
    private LocalDateTime syncedAt;
}
