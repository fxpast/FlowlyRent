package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "task_linen_usages")
@Data
public class TaskLinenUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private HousekeepingTask task;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "linen_item_id", nullable = false)
    private LinenItem linenItem;

    @Column(nullable = false)
    private int quantity;
}
