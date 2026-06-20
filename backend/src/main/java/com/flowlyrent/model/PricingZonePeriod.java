package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "pricing_zone_periods")
@Data
public class PricingZonePeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "zone_id", nullable = false)
    private Long zoneId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "start_month", nullable = false)
    private int startMonth;

    @Column(name = "start_day", nullable = false)
    private int startDay;

    @Column(name = "end_month", nullable = false)
    private int endMonth;

    @Column(name = "end_day", nullable = false)
    private int endDay;

    @Column(name = "adjustment_percent", nullable = false)
    private int adjustmentPercent;
}
