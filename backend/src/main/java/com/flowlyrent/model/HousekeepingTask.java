package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.model.enums.TaskType;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Cleaning / maintenance task, typically auto-generated on booking checkout
 * or created manually by the property manager.
 */
@Entity
@Table(name = "housekeeping_tasks")
@Data
public class HousekeepingTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    // The booking that triggered this task (null for manual tasks)
    @JsonIgnoreProperties({"property", "notes", "comments", "invoiceItems", "apiMessage", "rateDescription"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskType type = TaskType.CHECKOUT_CLEANING;

    @Column(nullable = false)
    private LocalDate scheduledDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.PENDING;

    // Name or contact of the person assigned to this task
    private String assignedTo;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private LocalDateTime completedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
