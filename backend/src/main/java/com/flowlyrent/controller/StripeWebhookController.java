package com.flowlyrent.controller;

import com.flowlyrent.service.SubscriptionService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/webhooks")
@RequiredArgsConstructor
@Slf4j
public class StripeWebhookController {

    private final SubscriptionService subscriptionService;

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    @PostMapping("/stripe")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            if (webhookSecret.isBlank()) {
                log.warn("STRIPE_WEBHOOK_SECRET non configuré — webhook ignoré");
                return ResponseEntity.ok("OK");
            }
            Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);

            subscriptionService.handleSubscriptionEvent(event);
            return ResponseEntity.ok("OK");
        } catch (SignatureVerificationException e) {
            log.warn("Signature Stripe invalide: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Signature invalide");
        } catch (Exception e) {
            log.error("Erreur webhook Stripe: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Erreur");
        }
    }
}
