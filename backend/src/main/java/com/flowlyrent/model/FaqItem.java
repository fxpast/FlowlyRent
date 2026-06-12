package com.flowlyrent.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "faq_items")
@Data
public class FaqItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String answer;

    @Column(columnDefinition = "TEXT") private String questionEn;
    @Column(columnDefinition = "TEXT") private String answerEn;
    @Column(columnDefinition = "TEXT") private String questionEs;
    @Column(columnDefinition = "TEXT") private String answerEs;
    @Column(columnDefinition = "TEXT") private String questionDe;
    @Column(columnDefinition = "TEXT") private String answerDe;
    @Column(columnDefinition = "TEXT") private String questionIt;
    @Column(columnDefinition = "TEXT") private String answerIt;

    @Column(nullable = false)
    private int displayOrder = 0;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
