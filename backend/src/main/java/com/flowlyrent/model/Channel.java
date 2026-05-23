package com.flowlyrent.model;

import com.flowlyrent.model.enums.Platform;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "channels")
@Data
public class Channel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Platform platform;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Column(columnDefinition = "TEXT")
    private String icalUrl;

    private String apiKey;
    private String apiSecret;

    private boolean active = true;

    private LocalDateTime lastSync;
    private Integer lastSyncBookingsCount = 0;
    private String lastSyncStatus;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
