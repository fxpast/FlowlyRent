package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Règle de catégorisation des transactions Qonto.
 * Remplace les vues SQL de l'ancien système.
 * Chaque utilisateur configure ses propres règles.
 */
@Entity
@Table(name = "expense_rules")
@Data
public class ExpenseRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    // Catégorie générique
    @Column(nullable = false)
    private String category; // ELECTRICITY, WATER, INTERNET, RENT, SOFTWARE, INSURANCE, MISC, INCOME

    // Nom affiché dans les rapports (libre)
    @Column(nullable = false)
    private String label;

    // null = charge globale, sinon = ID propriété Beds24
    private String beds24PropertyId;

    // Mots-clés cherchés dans le champ Libelle de Qonto
    @ElementCollection
    @CollectionTable(name = "expense_rule_keywords", joinColumns = @JoinColumn(name = "rule_id"))
    @Column(name = "keyword")
    private List<String> keywords = new ArrayList<>();

    // Mots-clés cherchés dans Libelle_complementaire, Nom, Commentaire
    @ElementCollection
    @CollectionTable(name = "expense_rule_alt_keywords", joinColumns = @JoinColumn(name = "rule_id"))
    @Column(name = "keyword")
    private List<String> altKeywords = new ArrayList<>();

    private boolean active = true;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
