package com.flowlyrent.dto;

import com.flowlyrent.model.enums.BookingSource;
import com.flowlyrent.model.enums.BookingStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class BookingResponse {
    private Long id;
    private String confirmationCode;
    private PropertySummary property;
    private GuestDTO guest;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private long nightsCount;
    private int guestCount;
    private BookingStatus status;
    private BookingSource source;
    private BigDecimal totalAmount;
    private String notes;
    private LocalDateTime createdAt;
    private PaymentSummary payment;

    @Data
    public static class PropertySummary {
        private Long id;
        private String name;
        private String address;
        private String city;
    }

    @Data
    public static class PaymentSummary {
        private Long id;
        private String status;
        private BigDecimal amount;
        private LocalDateTime paidAt;
    }
}
