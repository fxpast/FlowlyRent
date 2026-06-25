package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Journal des messages traités par le répondeur automatique.
 * La contrainte unique (userId, beds24MessageId) empêche le double-traitement.
 */
@Entity
@Table(name = "auto_responder_logs",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "beds24_message_id"}))
@Data
public class AutoResponderLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "beds24_message_id", nullable = false, length = 100)
    private String beds24MessageId;

    @Column(name = "booking_id", length = 100)
    private String bookingId;

    @Column(name = "property_id", length = 100)
    private String propertyId;

    /** SIMPLE ou SENSITIVE */
    @Column(nullable = false, length = 20)
    private String classification;

    /** true si une réponse automatique a été envoyée (simple = vraie réponse, sensible = message transitoire) */
    @Column(name = "auto_replied", nullable = false)
    private boolean autoReplied;

    /** Début du message voyageur (max 500 cars) pour l'affichage dans les logs */
    @Column(name = "guest_message_excerpt", columnDefinition = "TEXT")
    private String guestMessageExcerpt;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
