package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "property_bundles")
@Data
public class PropertyBundle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    private String name;

    @Column(name = "bundle_property_id", nullable = false)
    private String bundlePropertyId;

    @ElementCollection
    @CollectionTable(name = "property_bundle_members", joinColumns = @JoinColumn(name = "bundle_id"))
    @Column(name = "beds24_property_id")
    private List<String> memberPropertyIds = new ArrayList<>();

    private boolean enabled = true;

    private Integer horizonDays = 365;

    private LocalDateTime lastRunAt;

    private String lastRunStatus;
}
