package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.service.SubscriptionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin/subscription")
@RequiredArgsConstructor
@Tag(name = "Abonnement")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getSubscription() {
        return ResponseEntity.ok(subscriptionService.getSubscriptionInfo(securityUtils.getCurrentUser()));
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> startCheckout(@RequestBody Map<String, String> body) {
        AppUser user = securityUtils.getCurrentUser();
        String plan = body.get("plan");
        String successUrl = body.get("successUrl");
        String cancelUrl = body.get("cancelUrl");
        try {
            return ResponseEntity.ok(subscriptionService.createCheckoutSession(user, plan, successUrl, cancelUrl));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Erreur Stripe : " + e.getMessage()));
        }
    }

    @DeleteMapping
    public ResponseEntity<?> cancelSubscription() {
        try {
            subscriptionService.cancelSubscription(securityUtils.getCurrentUser());
            return ResponseEntity.ok(Map.of("status", "Abonnement annulé, plan réinitialisé à FREE"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
