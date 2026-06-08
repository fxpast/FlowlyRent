package com.flowlyrent.model;

import com.flowlyrent.config.EncryptionConverter;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "beds24_accounts")
@Data
public class Beds24Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private AppUser appUser;

    @Convert(converter = EncryptionConverter.class)
    @Column(columnDefinition = "TEXT")
    private String refreshToken;

    @Convert(converter = EncryptionConverter.class)
    @Column(columnDefinition = "TEXT")
    private String accessToken;

    private LocalDateTime tokenExpiresAt;

    private boolean connected = false;

    private LocalDateTime lastSync;
    private String lastSyncStatus;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
