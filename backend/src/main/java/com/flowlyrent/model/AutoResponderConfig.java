package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Configuration du répondeur automatique par hôte.
 * Une seule ligne par userId.
 */
@Entity
@Table(name = "auto_responder_configs")
@Data
public class AutoResponderConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** Répondeur activé ou non. */
    @Column(nullable = false)
    private boolean enabled = false;

    /**
     * Mots-clés sensibles séparés par des virgules.
     * Défaut : liste intégrée (urgence, fuite, panne, remboursement…).
     */
    @Column(name = "sensitive_keywords", columnDefinition = "TEXT")
    private String sensitiveKeywords;

    /**
     * Message transitoire envoyé au voyageur quand un cas sensible est détecté.
     * L'hôte reçoit en même temps une notification push.
     */
    @Column(name = "transitional_message", columnDefinition = "TEXT")
    private String transitionalMessage;

    /**
     * Instructions supplémentaires injectées dans le prompt IA (ton, style, infos spécifiques).
     * Optionnel — si vide, le prompt par défaut s'applique.
     */
    @Column(name = "system_prompt_extra", columnDefinition = "TEXT")
    private String systemPromptExtra;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
