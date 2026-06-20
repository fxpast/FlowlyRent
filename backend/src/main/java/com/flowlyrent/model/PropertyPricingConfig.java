package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Table(name = "property_pricing_configs",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "beds24_property_id"}))
@Data
public class PropertyPricingConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "beds24_property_id", nullable = false, length = 100)
    private String beds24PropertyId;

    @Column(name = "zone_id")
    private Long zoneId;

    @Column(name = "market_min", precision = 10, scale = 2)
    private BigDecimal marketMin;

    @Column(name = "market_max", precision = 10, scale = 2)
    private BigDecimal marketMax;
}
