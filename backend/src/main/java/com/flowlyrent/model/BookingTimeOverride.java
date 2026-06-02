package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "booking_time_overrides",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "beds24_booking_id"}))
@Data
public class BookingTimeOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "beds24_booking_id", nullable = false)
    private String beds24BookingId;

    private String checkinTime;   // HH:mm — null = heure standard (16:00)
    private String checkoutTime;  // HH:mm — null = heure standard (11:00)

    @Column(columnDefinition = "TEXT")
    private String note;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
