package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.flowlyrent.model.enums.LinenCategory;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "linen_items")
@Data
public class LinenItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false)
    private String beds24PropertyId;

    private String propertyName;

    @Column(nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LinenCategory category = LinenCategory.AUTRE;

    @Column(nullable = false)
    private int totalQuantity;

    private Integer minThreshold;

    private int sortOrder = 0;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
