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
    private int faiblePercent = 5;

    @Column(name = "moyen_percent", nullable = false)
    private int moyenPercent = 10;

    @Column(name = "fort_percent", nullable = false)
    private int fortPercent = 20;

    @Column(name = "exceptionnel_percent", nullable = false)
    private int exceptionnelPercent = 500;
}
