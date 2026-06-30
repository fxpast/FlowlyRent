package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.flowlyrent.model.enums.ChannelType;
import com.flowlyrent.model.enums.SubscriptionPlan;
import com.flowlyrent.model.enums.UserRole;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Data
public class AppUser implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    private String firstName;
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionPlan plan = SubscriptionPlan.FREE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.USER;

    // Slug unique pour le site de réservation public : /public/{slug}
    @Column(unique = true)
    private String publicSiteSlug;

    private String stripeCustomerId;
    private String stripeSubscriptionId;
    private java.time.LocalDateTime planExpiresAt;

    // Clés Stripe propres à chaque hôte (pour encaisser sur leur propre compte)
    private String stripePublishableKey;

    @JsonIgnore
    private String stripeSecretKey;

    private String phone;
    private String listingsSlug;
    private String beds24OwnerId;

    private String siret;
    private String companyName;

    @Column(columnDefinition = "TEXT")
    private String companyAddress;

    @Column(length = 500)
    private String companyLogoUrl;

    @Column(columnDefinition = "TEXT")
    private String invoiceFooter;

    @Enumerated(EnumType.STRING)
    private ChannelType channelType;

    private boolean active = true;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // --- UserDetails ---

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() { return email; }

    @Override public boolean isAccountNonExpired()   { return true; }
    @Override public boolean isAccountNonLocked()    { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled()             { return active; }

    public String getFullName() {
        return (firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "");
    }
}
