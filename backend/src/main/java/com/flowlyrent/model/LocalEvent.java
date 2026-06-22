package com.flowlyrent.model;

import com.flowlyrent.model.enums.ImpactLevel;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Table(name = "local_events")
@Data
public class LocalEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "zone_id")
    private Long zoneId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "impact_level", nullable = false, length = 10)
    private ImpactLevel impactLevel;

    @Column(nullable = false)
    private boolean recurring;
}
