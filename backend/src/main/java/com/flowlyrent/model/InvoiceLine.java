package com.flowlyrent.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.flowlyrent.model.enums.InvoiceLineType;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Table(name = "invoice_lines")
@Data
public class InvoiceLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    @JsonIgnore
    private Invoice invoice;

    private String description;

    @Column(precision = 10, scale = 2)
    private BigDecimal quantity;

    @Column(precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(precision = 5, scale = 2)
    private BigDecimal vatRate;

    @Enumerated(EnumType.STRING)
    private InvoiceLineType lineType = InvoiceLineType.CUSTOM;

    private int sortOrder;
}
