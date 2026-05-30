package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "housekeeper_profiles")
@Data
public class HousekeeperProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false)
    private String name;

    private String phone;
    private String email;
    private String notes;

    @Column(nullable = false)
    private boolean active = true;

    // Compte portail (HOUSEKEEPER role) — exposé uniquement id + email
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "linked_user_id")
    @JsonIgnoreProperties({"password","authorities","accountNonExpired","credentialsNonExpired",
        "accountNonLocked","enabled","publicSiteSlug","stripeCustomerId","stripeSubscriptionId",
        "planExpiresAt","active","createdAt","updatedAt","plan","role","firstName","lastName",
        "username","hibernateLazyInitializer","handler"})
    private AppUser linkedUser;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
