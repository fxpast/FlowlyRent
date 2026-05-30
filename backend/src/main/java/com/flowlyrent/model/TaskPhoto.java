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

    // Cloudinary (nouveaux uploads)
    @Column(length = 500)
    private String url;

    @Column(length = 200)
    private String publicId;

    // Base64 legacy (anciennes photos avant migration Cloudinary)
    @Column(columnDefinition = "LONGTEXT")
    private String data;

    private String caption;

    @CreationTimestamp
    private LocalDateTime uploadedAt;
}
