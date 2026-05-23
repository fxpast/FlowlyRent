package com.flowlyrent.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PaymentIntentRequest {
    @NotNull
    private Long bookingId;
    private String currency = "EUR";
    private String successUrl;
    private String cancelUrl;
}
