package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "qonto_accounts")
@Data
public class QontoAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true,
                foreignKey = @ForeignKey(foreignKeyDefinition = "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"))
    private AppUser appUser;

    private String login;

    @Column(columnDefinition = "TEXT")
    private String secretKey;

    private boolean connected = false;

    private LocalDateTime lastSync;
    private String lastSyncStatus;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
