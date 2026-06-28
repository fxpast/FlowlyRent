package com.flowlyrent.controller;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.PropertyConfigRepository;
import com.flowlyrent.service.Beds24ApiClient;
import com.stripe.Stripe;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.text.Normalizer;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Site public")
public class PublicBookingController {

    private final Beds24ApiClient beds24;
    private final AppUserRepository userRepo;
    private final Beds24AccountRepository accountRepo;
    private final PropertyConfigRepository propConfigRepo;

    @Value("${stripe.secret-key}")
    private String stripeSecretKey;

    // -------------------------------------------------------------------------
    // Informations du site de l'hôte
    // -------------------------------------------------------------------------

    @GetMapping("/{slug}/info")
    public ResponseEntity<?> getSiteInfo(@PathVariable String slug) {
        try {
            AppUser user = userRepo.findByPublicSiteSlug(slug)
                    .orElseThrow(() -> new IllegalArgumentException("Site non trouvé : " + slug));
            return ResponseEntity.ok(Map.of(
                    "slug",           slug,
                    "companyName",    user.getCompanyName()   != null ? user.getCompanyName()   : "",
                    "companyLogoUrl", user.getCompanyLogoUrl() != null ? user.getCompanyLogoUrl() : "",
                    "firstName",      user.getFirstName()     != null ? user.getFirstName()     : "",
                    "lastName",       user.getLastName()      != null ? user.getLastName()      : ""
            ));
        } catch (Exception e) {
            return error(e);
        }
    }

    // -------------------------------------------------------------------------
    // Propriétés
    // -------------------------------------------------------------------------

    @GetMapping("/{slug}/properties")
    public ResponseEntity<?> getProperties(@PathVariable String slug, @RequestParam Map<String, String> params) {
        try {
            Beds24Account account = accountForSlug(slug);
            return ResponseEntity.ok(beds24.getProperties(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/{slug}/properties/{propertyId}")
    public ResponseEntity<?> getProperty(
            @PathVariable String slug,
            @PathVariable String propertyId) {
        try {
            Beds24Account account = accountForSlug(slug);
            List<Map<String, Object>> props = beds24.getProperties(
                    beds24.tokenFor(account), Map.of("propertyId", propertyId));
            if (props == null || props.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(props.get(0));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/{slug}/properties/{propertyId}/photos")
    public ResponseEntity<?> getPropertyPhotos(
            @PathVariable String slug,
            @PathVariable String propertyId) {
        try {
            Beds24Account account = accountForSlug(slug);
            return ResponseEntity.ok(beds24.getPropertyPhotos(beds24.tokenFor(account), propertyId));
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

    // -------------------------------------------------------------------------
    // Réservation
    // -------------------------------------------------------------------------

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

    @GetMapping("/{slug}/bookings/{bookingId}")
    public ResponseEntity<?> getBooking(
            @PathVariable String slug,
            @PathVariable String bookingId) {
        try {
            Beds24Account account = accountForSlug(slug);
            List<Map<String, Object>> bookings = beds24.getBookingsAllStatuses(
                    beds24.tokenFor(account), Map.of("bookingId", bookingId));
            if (bookings == null || bookings.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(bookings.get(0));
        } catch (Exception e) {
            return error(e);
        }
    }

    // -------------------------------------------------------------------------
    // Paiement Stripe — réservation directe
    // -------------------------------------------------------------------------

    /**
     * Crée une Stripe Checkout Session pour le paiement d'une réservation directe.
     * Body attendu : { amountCents, currency, description, guestEmail, successUrl, cancelUrl }
     * Retourne : { sessionUrl }
     */
    @PostMapping("/{slug}/bookings/{bookingId}/checkout")
    public ResponseEntity<?> createBookingCheckout(
            @PathVariable String slug,
            @PathVariable String bookingId,
            @RequestBody Map<String, Object> body) {
        try {
            // Vérifier que le site existe
            userRepo.findByPublicSiteSlug(slug)
                    .orElseThrow(() -> new IllegalArgumentException("Site non trouvé : " + slug));

            Stripe.apiKey = stripeSecretKey;

            long amountCents  = toLong(body.get("amountCents"));
            String currency   = body.getOrDefault("currency",    "eur").toString();
            String description = body.getOrDefault("description", "Réservation").toString();
            String guestEmail = body.getOrDefault("guestEmail",  "").toString();
            String successUrl = body.getOrDefault("successUrl",  "").toString();
            String cancelUrl  = body.getOrDefault("cancelUrl",   "").toString();

            if (amountCents <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Montant invalide"));
            }

            SessionCreateParams.Builder builder = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(successUrl)
                    .setCancelUrl(cancelUrl)
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency(currency)
                                    .setUnitAmount(amountCents)
                                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName(description)
                                            .build())
                                    .build())
                            .setQuantity(1L)
                            .build())
                    .putMetadata("type",      "booking")
                    .putMetadata("bookingId", bookingId)
                    .putMetadata("slug",      slug);

            if (!guestEmail.isBlank()) {
                builder.setCustomerEmail(guestEmail);
            }

            Session session = Session.create(builder.build());
            log.info("[checkout] Session créée — bookingId={} slug={} amount={}{}",
                    bookingId, slug, amountCents, currency.toUpperCase());

            return ResponseEntity.ok(Map.of("sessionUrl", session.getUrl()));
        } catch (Exception e) {
            log.error("[checkout] Erreur : {}", e.getMessage(), e);
            return error(e);
        }
    }

    // -------------------------------------------------------------------------
    // Messages OTA
    // -------------------------------------------------------------------------

    @GetMapping("/{slug}/bookings/{bookingId}/messages")
    public ResponseEntity<?> getMessages(
            @PathVariable String slug,
            @PathVariable String bookingId) {
        try {
            Beds24Account account = accountForSlug(slug);
            return ResponseEntity.ok(beds24.getMessages(
                    beds24.tokenFor(account), Map.of("bookingId", bookingId)));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PostMapping("/{slug}/bookings/{bookingId}/messages")
    public ResponseEntity<?> sendMessage(
            @PathVariable String slug,
            @PathVariable String bookingId,
            @RequestBody Map<String, Object> body) {
        try {
            Beds24Account account = accountForSlug(slug);
            String content = body.getOrDefault("content", "").toString().trim();
            if (content.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Message vide"));
            }
            List<Map<String, Object>> payload = List.of(Map.of(
                    "bookingId", bookingId,
                    "message",   content,
                    "fromType",  "guest"
            ));
            return ResponseEntity.ok(beds24.sendMessages(beds24.tokenFor(account), payload));
        } catch (Exception e) {
            return error(e);
        }
    }

    // -------------------------------------------------------------------------
    // Résolution page iframe Beds24 (legacy — conserver pour compatibilité)
    // -------------------------------------------------------------------------

    @GetMapping("/p/{userSlug}/{pageSlug}")
    public ResponseEntity<?> resolvePublicPage(
            @PathVariable String userSlug,
            @PathVariable String pageSlug) {
        AppUser user = userRepo.findByPublicSiteSlug(userSlug).orElse(null);
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

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

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

    private static long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Number n) return n.longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return 0L; }
    }

    private ResponseEntity<Map<String, String>> error(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Erreur interne"));
    }
}
