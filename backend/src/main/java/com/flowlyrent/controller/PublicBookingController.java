package com.flowlyrent.controller;

import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.service.Beds24ApiClient;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
@Tag(name = "Site public")
public class PublicBookingController {

    private final Beds24ApiClient beds24;
    private final AppUserRepository userRepo;
    private final Beds24AccountRepository accountRepo;

    // --- Propriétés du site public ---

    @GetMapping("/{slug}/properties")
    public ResponseEntity<?> getProperties(@PathVariable String slug, @RequestParam Map<String, String> params) {
        try {
            Beds24Account account = accountForSlug(slug);
            return ResponseEntity.ok(beds24.getProperties(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/{slug}/properties/{propertyId}/availability")
    public ResponseEntity<?> getAvailability(
            @PathVariable String slug,
            @PathVariable String propertyId,
            @RequestParam Map<String, String> params) {
        try {
            params.put("propertyId", propertyId);
            Beds24Account account = accountForSlug(slug);
            return ResponseEntity.ok(beds24.getAvailability(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/{slug}/properties/{propertyId}/offers")
    public ResponseEntity<?> getOffers(
            @PathVariable String slug,
            @PathVariable String propertyId,
            @RequestParam Map<String, String> params) {
        try {
            params.put("propertyId", propertyId);
            Beds24Account account = accountForSlug(slug);
            return ResponseEntity.ok(beds24.getOffers(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    // --- Réservation publique ---

    @PostMapping("/{slug}/bookings")
    public ResponseEntity<?> createBooking(
            @PathVariable String slug,
            @RequestBody List<Map<String, Object>> payload) {
        try {
            Beds24Account account = accountForSlug(slug);
            return ResponseEntity.ok(beds24.saveBookings(beds24.tokenFor(account), payload));
        } catch (Exception e) {
            return error(e);
        }
    }

    // --- Messages OTA via Beds24 ---

    @GetMapping("/{slug}/bookings/{bookingId}/messages")
    public ResponseEntity<?> getMessages(
            @PathVariable String slug,
            @PathVariable String bookingId) {
        try {
            Map<String, String> params = Map.of("bookingId", bookingId);
            Beds24Account account = accountForSlug(slug);
            return ResponseEntity.ok(beds24.getMessages(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    // --- Helpers ---

    private Beds24Account accountForSlug(String slug) {
        return userRepo.findByPublicSiteSlug(slug)
                .flatMap(user -> accountRepo.findByAppUserId(user.getId()))
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalArgumentException("Site non trouvé ou non connecté : " + slug));
    }

    private ResponseEntity<Map<String, String>> error(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
