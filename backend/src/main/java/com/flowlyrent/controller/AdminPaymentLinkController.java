package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.PaymentLink;
import com.flowlyrent.repository.PaymentLinkRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Crée les liens de paiement courts envoyés au voyageur depuis le dialog réservation
 * (bouton "Paiement" / "Caution") — voir PublicBookingController pour la résolution publique.
 */
@RestController
@RequestMapping("/admin/payment-links")
@RequiredArgsConstructor
@Tag(name = "Liens de paiement")
public class AdminPaymentLinkController {

    private final PaymentLinkRepository paymentLinkRepo;
    private final SecurityUtils securityUtils;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        AppUser user = securityUtils.getCurrentUser();

        String bookingId = String.valueOf(body.getOrDefault("bookingId", ""));
        Object amountCentsRaw = body.get("amountCents");
        if (bookingId.isBlank() || amountCentsRaw == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "bookingId et amountCents requis"));
        }

        PaymentLink link = new PaymentLink();
        link.setUser(user);
        link.setBookingId(bookingId);
        link.setAmountCents(((Number) amountCentsRaw).longValue());
        link.setCurrency(String.valueOf(body.getOrDefault("currency", "eur")));
        link.setDescription(String.valueOf(body.getOrDefault("description", "")));
        link.setGuestEmail(String.valueOf(body.getOrDefault("guestEmail", "")));
        link.setGuestName(String.valueOf(body.getOrDefault("guestName", "")));
        link.setPropertyName(String.valueOf(body.getOrDefault("propertyName", "")));
        link.setCheckIn(String.valueOf(body.getOrDefault("checkIn", "")));
        link.setCheckOut(String.valueOf(body.getOrDefault("checkOut", "")));
        link.setCaptureMethod(String.valueOf(body.getOrDefault("captureMethod", "automatic")));

        paymentLinkRepo.save(link);
        return ResponseEntity.ok(Map.of("token", link.getToken()));
    }
}
