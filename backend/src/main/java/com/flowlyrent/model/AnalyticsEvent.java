package com.flowlyrent.model;

import com.flowlyrent.model.enums.AnalyticsEventType;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "analytics_events", indexes = {
    @Index(columnList = "type, created_at"),
    @Index(columnList = "user_id")
})
@Data
public class AnalyticsEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AnalyticsEventType type;

    private Long userId;

    @Column(length = 255)
    private String page;

    @Column(length = 45)
    private String ipAddress;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
