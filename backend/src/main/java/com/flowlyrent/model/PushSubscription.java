package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "push_subscriptions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "endpoint"}))
@Data
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false, length = 500)
    private String endpoint;

    @Column(nullable = false)
    private String auth;

    @Column(nullable = false)
    private String p256dh;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
