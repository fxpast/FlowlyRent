package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.flowlyrent.model.enums.ConciergeLeadStatus;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Demande de contact soumise par un propriétaire depuis la page publique Conciergerie.
 */
@Entity
@Table(name = "concierge_leads")
@Data
public class ConciergeLead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    @Column(name = "owner_name", nullable = false)
    private String ownerName;

    @Column(name = "owner_email")
    private String ownerEmail;

    @Column(name = "owner_phone")
    private String ownerPhone;

    @Column(name = "property_city")
    private String propertyCity;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConciergeLeadStatus status = ConciergeLeadStatus.NEW;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
