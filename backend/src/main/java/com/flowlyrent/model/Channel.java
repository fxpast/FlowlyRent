package com.flowlyrent.model;

import com.flowlyrent.model.enums.Platform;
import com.flowlyrent.model.enums.SyncType;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SyncType syncType = SyncType.ICAL;

    @Column(columnDefinition = "TEXT")
    private String icalUrl;

    private String apiKey;      // Beds24 : refresh token (durable)
    private String apiSecret;

    // ID de la propriété dans Beds24 (requis si syncType = BEDS24)
    private String externalPropertyId;

    // Beds24 : access token courant (court-vécu)
    @Column(columnDefinition = "TEXT")
    private String accessToken;
    private LocalDateTime tokenExpiresAt;

    private boolean active = true;

    private LocalDateTime lastSync;
    private Integer lastSyncBookingsCount = 0;
    private String lastSyncStatus;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
