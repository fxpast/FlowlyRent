package com.flowlyrent.dto;

import com.flowlyrent.model.enums.BookingSource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BookingRequest {

    @NotNull
    private Long propertyId;

    @Valid
    @NotNull
    private GuestDTO guest;

    @NotNull
    @Future
    private LocalDate checkIn;

    @NotNull
    private LocalDate checkOut;

    @Min(1)
    private int guestCount = 1;

    private BigDecimal totalAmount;
    private BookingSource source = BookingSource.DIRECT;
    private String notes;
}
