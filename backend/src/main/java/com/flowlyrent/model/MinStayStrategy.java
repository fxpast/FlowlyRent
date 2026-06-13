package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "min_stay_strategies")
@Data
public class MinStayStrategy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private AppUser user;

    private boolean enabled = false;

    // Nombre de jours à partir d'aujourd'hui considérés comme "proches"
    private Integer nearDays = 10;

    // Durée minimum (en nuits) appliquée sur la période proche
    private Integer nearMinStay = 2;

    // Durée minimum (en nuits) appliquée sur le reste du calendrier
    private Integer farMinStay = 3;

    // Horizon (en jours) jusqu'où appliquer la durée minimum "lointaine"
    private Integer horizonDays = 365;

    private LocalDateTime lastRunAt;

    private String lastRunStatus;
}
