package com.flowlyrent.model;

import com.flowlyrent.model.enums.SenderType;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Data
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SenderType sender;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private boolean read = false;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
