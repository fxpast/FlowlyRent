package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

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

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "admin_notification_targets",
        joinColumns = @JoinColumn(name = "notification_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @JsonIgnore
    private Set<AppUser> targetUsers = new HashSet<>();
}
