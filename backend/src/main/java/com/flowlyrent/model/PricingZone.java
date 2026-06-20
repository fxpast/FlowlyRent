package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "pricing_zones")
@Data
public class PricingZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 100)
    private String name;
}
