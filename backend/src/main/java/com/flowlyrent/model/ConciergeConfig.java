package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Contenu de la page publique "Conciergerie" (/{slug}/conciergerie) — landing page B2B pour
 * attirer des propriétaires. Une ligne par hôte, comme PricingEventImpactConfig. Les listes
 * (services, stats, étapes, témoignages) sont stockées en JSON, même pattern que
 * PropertyConfig.photoUrlsJson — pas de table enfant séparée.
 */
@Entity
@Table(name = "concierge_configs", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id"}))
@Data
public class ConciergeConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private boolean enabled = false;

    private String heroTitle;
    private String heroSubtitle;

    @Column(name = "hero_image_url", length = 500)
    private String heroImageUrl;

    @Column(name = "hero_image_public_id", length = 255)
    private String heroImagePublicId;

    @Column(columnDefinition = "TEXT")
    private String pitch;

    /** List<{icon, title, description}> */
    @Column(name = "services_json", columnDefinition = "TEXT")
    private String servicesJson;

    /** List<{number, label}> */
    @Column(name = "stats_json", columnDefinition = "TEXT")
    private String statsJson;

    /** List<{title, description}> */
    @Column(name = "steps_json", columnDefinition = "TEXT")
    private String stepsJson;

    @Column(name = "pricing_text", columnDefinition = "TEXT")
    private String pricingText;

    /** List<{authorName, text}> */
    @Column(name = "testimonials_json", columnDefinition = "TEXT")
    private String testimonialsJson;

    /** Traductions auto (MyMemory, comme FaqTranslationService) : {"en": {...}, "es": {...}, "de": {...}, "it": {...}}
     *  Régénéré en async à chaque sauvegarde de config — voir ConciergeTranslationService. */
    @Column(name = "translations_json", columnDefinition = "TEXT")
    private String translationsJson;

    @Column(name = "contact_whatsapp")
    private String contactWhatsapp;

    @Column(name = "cta_button_text")
    private String ctaButtonText;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
