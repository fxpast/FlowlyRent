package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "local_properties")
@Data
public class LocalProperty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    @Column(nullable = false)
    private String name;

    private String shortName;

    @Column(columnDefinition = "TEXT")
    private String icalUrl;

    @Column(name = "ical_feed_token", unique = true, nullable = false)
    private String icalFeedToken;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @PrePersist
    public void generateFeedToken() {
        if (this.icalFeedToken == null) {
            this.icalFeedToken = UUID.randomUUID().toString();
        }
    }
}
