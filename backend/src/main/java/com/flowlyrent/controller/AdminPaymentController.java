package com.flowlyrent.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Les paiements de réservation sont gérés par Beds24 (Stripe intégré).
 * Les abonnements FlowlyRent sont gérés par SubscriptionController.
 */
@RestController
@RequestMapping("/admin/payments")
@Tag(name = "Admin - Paiements")
public class AdminPaymentController {

    @GetMapping
    public ResponseEntity<Map<String, String>> info() {
        return ResponseEntity.ok(Map.of(
                "info", "Les paiements de réservation sont gérés directement par Beds24. Voir /admin/subscription pour les abonnements FlowlyRent."
        ));
    }
}
