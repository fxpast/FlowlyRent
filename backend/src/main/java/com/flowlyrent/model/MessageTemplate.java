package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Template email/SMS pour réservations directes (non OTA).
 * Beds24 ne supporte pas la messagerie pour les réservations directes,
 * donc on envoie des templates par email ou SMS.
 */
@Entity
@Table(name = "message_templates")
@Data
public class MessageTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    // null = s'applique à toutes les propriétés
    private String beds24PropertyId;

    @Column(nullable = false)
    private String type; // CHECKIN, CHECKOUT, REMINDER, CUSTOM

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String contentFr;

    @Column(columnDefinition = "TEXT")
    private String contentEn;

    private String channel; // EMAIL, SMS, BOTH

    private boolean active = true;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
