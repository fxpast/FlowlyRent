package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "property_inventory_items")
@Data
public class PropertyInventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false)
    private String beds24PropertyId;

    @Column(nullable = false)
    private String category; // BEDS | APPLIANCES | TECH | KITCHEN | BATHROOM | OUTDOOR | OTHER

    @Column(nullable = false)
    private String label;   // "Lit double", "Télévision"…

    private String details; // "160x200", "55 pouces"…

    private int quantity = 1;

    private int sortOrder = 0;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
