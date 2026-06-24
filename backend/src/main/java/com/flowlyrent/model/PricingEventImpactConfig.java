package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "pricing_event_impact_configs",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id"}))
@Data
public class PricingEventImpactConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "faible_percent", nullable = false)
    private int faiblePercent = 25;

    @Column(name = "moyen_percent", nullable = false)
    private int moyenPercent = 50;

    @Column(name = "fort_percent", nullable = false)
    private int fortPercent = 75;
}
