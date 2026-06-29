package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "property_configs",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "beds24_property_id"}))
@Data
public class PropertyConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "beds24_property_id", nullable = false)
    private String beds24PropertyId;

    /** roomId Beds24 correspondant à ce logement — quasi-statique, mis en cache ici
     *  pour éviter de redemander la correspondance à Beds24 à chaque écriture (prix,
     *  blocage, réservation), ce qui consomme des crédits d'API inutilement. */
    @Column(name = "room_id")
    private Long roomId;

    private String shortName;

    private String accessCode;

    private String previousAccessCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "key_box_id")
    @JsonIgnore
    private KeyBox keyBox;

    private Float cleaningHours;

    private Float cleaningFee;

    private Integer extraPersonThreshold;

    private Float extraPersonFee;

    private Float discount7Nights;

    private Float discount28Nights;

    @Column(name = "cover_photo_url", length = 500)
    private String coverPhotoUrl;

    @Column(name = "photo_urls_json", columnDefinition = "TEXT")
    private String photoUrlsJson;

    /** Non null → ce PropertyConfig est le pendant iCal d'un LocalProperty (mode iCal).
     *  Null  → PropertyConfig Beds24 classique (mode channel manager). */
    @Column(name = "local_property_id")
    private Long localPropertyId;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
