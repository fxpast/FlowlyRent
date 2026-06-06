package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.flowlyrent.model.enums.InvoiceStatus;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invoices")
@Data
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    @Column(nullable = false)
    private String invoiceNumber;

    private int invoiceYear;
    private int invoiceSeq;

    private String beds24BookingId;

    private String guestName;
    private String guestEmail;

    @Column(columnDefinition = "TEXT")
    private String guestAddress;

    @Column(nullable = false)
    private LocalDate issueDate;

    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvoiceStatus status = InvoiceStatus.DRAFT;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("sortOrder ASC")
    private List<InvoiceLine> lines = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
