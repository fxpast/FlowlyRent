package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "booking_message_logs",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "booking_id"}))
@Data
public class BookingMessageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "booking_id", nullable = false, length = 100)
    private String bookingId;

    @CreationTimestamp
    private LocalDateTime sentAt;
}
