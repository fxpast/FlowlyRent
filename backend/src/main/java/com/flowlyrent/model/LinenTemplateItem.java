package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.flowlyrent.model.enums.LinenCategory;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "linen_template_items")
@Data
public class LinenTemplateItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private LinenTemplate template;

    @Column(nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LinenCategory category = LinenCategory.AUTRE;

    @Column(nullable = false)
    private int totalQuantity;

    private Integer minThreshold;

    private Integer defaultPerCleaning;

    private int sortOrder = 0;
}
