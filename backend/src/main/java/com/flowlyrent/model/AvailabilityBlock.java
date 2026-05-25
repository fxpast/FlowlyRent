package com.flowlyrent.model;

import com.flowlyrent.model.enums.BlockType;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Manually blocked date range on a property (owner stay, maintenance, etc.).
 * Availability checks must exclude both confirmed bookings AND these blocks.
 */
@Entity
@Table(name = "availability_blocks")
@Data
public class AvailabilityBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    // Optional — null means the block applies to the whole property
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private PropertyRoom room;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlockType type = BlockType.OTHER;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // The user (property manager) who created this block
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
