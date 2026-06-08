package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.flowlyrent.model.enums.MovementDirection;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "linen_movements")
@Data
public class LinenMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linen_item_id", nullable = false)
    private LinenItem linenItem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MovementDirection direction;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private LocalDate movementDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private Long housekeepingTaskId;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
