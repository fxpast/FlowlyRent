package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Trace légère d'une réservation directe créée via le site public — sert
 * uniquement à compter les séjours d'un même voyageur (par email) pour
 * détecter les paliers de fidélité, sans appel Beds24 supplémentaire.
 * Ne compte pas rétroactivement les réservations faites avant l'ajout de
 * cette table (le compteur démarre à zéro).
 */
@Entity
@Table(name = "guest_booking_logs", indexes = {
    @Index(columnList = "user_id, guest_email")
})
@Data
public class GuestBookingLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    @Column(name = "beds24_property_id", nullable = false)
    private String beds24PropertyId;

    @Column(name = "guest_email", nullable = false)
    private String guestEmail;

    @Column(name = "beds24_booking_id")
    private String beds24BookingId;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
