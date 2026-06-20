package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "booking_message_logs",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "property_id", "type"}))
@Data
public class BookingMessageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "property_id", nullable = false, length = 100)
    private String propertyId;

    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "booking_id", nullable = false, length = 100)
    private String bookingId;

    @CreationTimestamp
    private LocalDateTime sentAt;
}
