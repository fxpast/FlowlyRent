package com.flowlyrent.controller;

import com.flowlyrent.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/webhooks")
@RequiredArgsConstructor
@Slf4j
public class StripeWebhookController {

    private final PaymentService paymentService;

    @PostMapping("/stripe")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            paymentService.handleWebhook(payload, sigHeader);
            return ResponseEntity.ok("OK");
        } catch (IllegalArgumentException e) {
            log.warn("Signature Stripe invalide: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Signature invalide");
        } catch (Exception e) {
            log.error("Erreur webhook Stripe: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Erreur");
        }
    }
}
