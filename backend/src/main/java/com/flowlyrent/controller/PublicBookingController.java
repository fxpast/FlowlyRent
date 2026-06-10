package com.flowlyrent.controller;

import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.PropertyConfigRepository;
import com.flowlyrent.service.Beds24ApiClient;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.text.Normalizer;
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
    private final PropertyConfigRepository propConfigRepo;

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

    // --- Résolution page iframe Beds24 ---

    @GetMapping("/p/{userSlug}/{pageSlug}")
    public ResponseEntity<?> resolvePublicPage(
            @PathVariable String userSlug,
            @PathVariable String pageSlug) {
        com.flowlyrent.model.AppUser user = userRepo.findByPublicSiteSlug(userSlug).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        if (pageSlug.equals(user.getListingsSlug())
                && user.getBeds24OwnerId() != null && !user.getBeds24OwnerId().isBlank()) {
            String url = "https://beds24.com/booking2.php?ownerid=" + user.getBeds24OwnerId() + "&referer=appGoOtoor";
            return ResponseEntity.ok(Map.of("type", "LISTINGS", "iframeUrl", url));
        }

        List<PropertyConfig> cfgs = propConfigRepo.findByUserId(user.getId());
        for (PropertyConfig cfg : cfgs) {
            if (cfg.getShortName() != null && slugify(cfg.getShortName()).equals(pageSlug)
                    && cfg.getBeds24PropertyId() != null) {
                String url = "https://beds24.com/booking.php?propid=" + cfg.getBeds24PropertyId() + "&referer=appGoOtoor";
                return ResponseEntity.ok(Map.of("type", "PROPERTY", "iframeUrl", url));
            }
        }
        return ResponseEntity.notFound().build();
    }

    // --- Helpers ---

    private Beds24Account accountForSlug(String slug) {
        return userRepo.findByPublicSiteSlug(slug)
                .flatMap(user -> accountRepo.findByAppUserId(user.getId()))
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalArgumentException("Site non trouvé ou non connecté : " + slug));
    }

    private static String slugify(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return normalized.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }

    private ResponseEntity<Map<String, String>> error(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
