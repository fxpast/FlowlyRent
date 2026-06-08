package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_notifications")
@Data
public class AdminNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    private String sentByEmail;

    @CreationTimestamp
    private LocalDateTime sentAt;
}
