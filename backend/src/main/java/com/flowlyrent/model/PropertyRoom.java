package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * A bookable room/unit within a property, synced from Beds24 /properties/{id}/rooms.
 * One Beds24 property can have N rooms (e.g. an apartment complex with multiple units).
 */
@Entity
@Table(name = "property_rooms", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"property_id", "beds24_room_id"})
})
@Data
public class PropertyRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    // Beds24 room ID (from /properties/{id}/rooms → data[].id)
    @Column(name = "beds24_room_id")
    private String beds24RoomId;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Integer maxGuests;

    // Number of identical units available (Beds24 "qty")
    private Integer qty = 1;

    private String roomType;   // apartment, studio, room, ...
    private String bedType;    // queen, twin, double, ...

    private boolean active = true;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
