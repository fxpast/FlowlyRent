package com.flowlyrent.controller;

import com.flowlyrent.service.SubscriptionService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
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

            switch (event.getType()) {
                case "checkout.session.completed" -> {
                    Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
                    if (session != null && "booking".equals(session.getMetadata().get("type"))) {
                        handleBookingPaymentFromSession(session);
                    } else {
                        subscriptionService.handleSubscriptionEvent(event);
                    }
                }
                case "payment_intent.succeeded" -> {
                    PaymentIntent pi = (PaymentIntent) event.getDataObjectDeserializer().getObject().orElse(null);
                    if (pi != null && "booking".equals(pi.getMetadata().get("type"))) {
                        handleBookingPaymentFromIntent(pi);
                    }
                }
                default -> subscriptionService.handleSubscriptionEvent(event);
            }

            return ResponseEntity.ok("OK");
        } catch (SignatureVerificationException e) {
            log.warn("Signature Stripe invalide: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Signature invalide");
        } catch (Exception e) {
            log.error("Erreur webhook Stripe: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Erreur");
        }
    }

    private void handleBookingPaymentFromSession(Session session) {
        String bookingId = session.getMetadata().get("bookingId");
        String slug      = session.getMetadata().get("slug");
        long   amount    = session.getAmountTotal() != null ? session.getAmountTotal() : 0L;
        String currency  = session.getCurrency() != null ? session.getCurrency().toUpperCase() : "EUR";
        log.info("[booking-payment] Paiement confirmé (checkout) — bookingId={} slug={} amount={}{} session={}",
                bookingId, slug, amount / 100.0, currency, session.getId());
    }

    private void handleBookingPaymentFromIntent(PaymentIntent pi) {
        String bookingId = pi.getMetadata().get("bookingId");
        String slug      = pi.getMetadata().get("slug");
        long   amount    = pi.getAmount() != null ? pi.getAmount() : 0L;
        String currency  = pi.getCurrency() != null ? pi.getCurrency().toUpperCase() : "EUR";
        log.info("[booking-payment] Paiement confirmé (payment_intent) — bookingId={} slug={} amount={}{} intent={}",
                bookingId, slug, amount / 100.0, currency, pi.getId());
    }
}
