package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "property_ical_sources")
@Data
public class PropertyIcalSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "local_property_id", nullable = false)
    @JsonIgnore
    private LocalProperty localProperty;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String url;

    private LocalDateTime lastSync;
    private Integer lastSyncCount;
}
