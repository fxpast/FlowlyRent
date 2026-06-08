package com.flowlyrent.model;

import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.model.enums.TaskType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "housekeeping_tasks")
@Data
public class HousekeepingTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id")
    private HousekeepingStaff staff;

    @JsonIgnoreProperties({"createdAt","updatedAt","active","linkedUser","user"})
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "housekeeper_id")
    private HousekeeperProfile housekeeper;

    // Références Beds24 (pas de FK locale — architecture pass-through)
    @Column(nullable = false)
    private String beds24PropertyId;

    private String beds24BookingId; // null pour les tâches manuelles
    private String propertyName;    // nom affiché (non-sensible, mis en cache)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskType type = TaskType.CHECKOUT_CLEANING;

    @Column(nullable = false)
    private LocalDateTime scheduledDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.PENDING;

    private BigDecimal hourlyRate;
    private Float extraHours;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // Rapport prestataire
    @Column(columnDefinition = "TEXT")
    private String reportComment;

    private Boolean hasIncident = false;

    @Column(columnDefinition = "TEXT")
    private String incidentDescription;

    private LocalDateTime reportedAt;

    private LocalDateTime completedAt;

    private Boolean linenDeducted = false;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
