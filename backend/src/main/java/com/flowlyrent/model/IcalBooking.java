package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ical_bookings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"local_property_id", "ical_uid"})
})
@Data
public class IcalBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "local_property_id", nullable = false)
    @JsonIgnore
    private LocalProperty localProperty;

    @Column(name = "ical_uid", nullable = false)
    private String icalUid;

    private String summary;

    private LocalDate arrival;
    private LocalDate departure;

    private String status = "confirmed";

    @Column(name = "source_id")
    private Long sourceId;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
