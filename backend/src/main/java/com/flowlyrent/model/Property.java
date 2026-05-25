package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "properties")
@Data
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String address;
    private String city;
    private String country;

    private Integer maxGuests;

    @Column(precision = 10, scale = 2)
    private BigDecimal pricePerNight;

    @Column(precision = 10, scale = 2)
    private BigDecimal cleaningFee = BigDecimal.ZERO;

    @ElementCollection
    @CollectionTable(name = "property_images", joinColumns = @JoinColumn(name = "property_id"))
    @Column(name = "image_url")
    private List<String> images = new ArrayList<>();

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private AppUser appUser;

    // ID de la propriété dans Beds24 (null si propriété créée directement)
    private String beds24PropId;

    private String propertyType;  // apartment, townhome, ...
    private Double latitude;
    private Double longitude;
    private String checkInTime;   // ex: "16:00"
    private String checkOutTime;  // ex: "11:00"

    private boolean active = true;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
