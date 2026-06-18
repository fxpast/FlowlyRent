package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "chatbot_action_feedbacks")
@Data
public class ChatbotActionFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String action;

    @Column(name = "user_message", columnDefinition = "TEXT")
    private String userMessage;

    @Column(nullable = false, length = 5)
    private String lang;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
