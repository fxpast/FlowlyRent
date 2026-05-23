package com.flowlyrent.controller;

import com.flowlyrent.dto.PaymentIntentRequest;
import com.flowlyrent.model.Payment;
import com.flowlyrent.service.PaymentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/payments")
@RequiredArgsConstructor
@Tag(name = "Admin - Paiements")
public class AdminPaymentController {

    private final PaymentService paymentService;

    @GetMapping
    public List<Payment> getAllPayments() {
        return paymentService.getAllPayments();
    }

    @PostMapping("/checkout-session")
    public ResponseEntity<Map<String, Object>> createCheckoutSession(@Valid @RequestBody PaymentIntentRequest request) throws Exception {
        return ResponseEntity.ok(paymentService.createCheckoutSession(
                request.getBookingId(), request.getSuccessUrl(), request.getCancelUrl()));
    }

    @PostMapping("/payment-intent")
    public ResponseEntity<Map<String, Object>> createPaymentIntent(@Valid @RequestBody PaymentIntentRequest request) throws Exception {
        return ResponseEntity.ok(paymentService.createPaymentIntent(request.getBookingId()));
    }
}
