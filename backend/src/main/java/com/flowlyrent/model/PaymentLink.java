package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lien de paiement court envoyé au voyageur (WhatsApp/SMS/email) depuis le dialog réservation —
 * évite d'encoder toutes les infos de la réservation dans l'URL (bookingId, montant, dates...).
 */
@Entity
@Table(name = "payment_links")
@Data
public class PaymentLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    @Column(nullable = false)
    private String bookingId;

    @Column(nullable = false)
    private Long amountCents;

    private String currency;
    private String description;
    private String guestEmail;
    private String guestName;
    private String propertyName;
    private String checkIn;
    private String checkOut;

    /** "automatic" (paiement) ou "manual" (caution — autorisation sans débit) */
    @Column(nullable = false)
    private String captureMethod;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @PrePersist
    public void generateToken() {
        if (this.token == null) {
            this.token = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        }
    }
}
