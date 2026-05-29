package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "task_photos")
@Data
public class TaskPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private HousekeepingTask task;

    @Column(nullable = false)
    private String photoType; // BEFORE, AFTER, INCIDENT

    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String data; // base64 data URI

    private String caption;

    @CreationTimestamp
    private LocalDateTime uploadedAt;
}
