package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "property_photos")
@Data
public class PropertyPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_config_id", nullable = false)
    private PropertyConfig propertyConfig;

    @Column(length = 500)
    private String url;

    @Column(length = 200)
    private String publicId;

    @Column(columnDefinition = "LONGTEXT NULL")
    private String data;

    @Column(length = 200)
    private String caption;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime uploadedAt;
}
