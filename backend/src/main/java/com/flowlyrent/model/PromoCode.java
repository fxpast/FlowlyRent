package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Code promo créé par l'hôte pour un logement précis, utilisable par les voyageurs sur le
 * site de réservation public (ex. "REDUC10" = 10% de réduction sur le prix des nuits).
 */
@Entity
@Table(name = "promo_codes", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "beds24_property_id", "code"}))
@Data
public class PromoCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    @Column(name = "beds24_property_id", nullable = false)
    private String beds24PropertyId;

    @Column(nullable = false)
    private String code;

    @Column(name = "discount_percent", nullable = false)
    private Integer discountPercent;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "usage_count", nullable = false)
    private int usageCount = 0;

    /** Non null → code de fidélité généré automatiquement pour ce voyageur
     *  précis (gamification), désactivé après son unique utilisation.
     *  Null → code promo classique créé par l'hôte, réutilisable. */
    @Column(name = "restricted_guest_email")
    private String restrictedGuestEmail;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
