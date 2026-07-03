package com.flowlyrent.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.model.AdminNotification;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.ConciergeConfig;
import com.flowlyrent.model.ConciergeLead;
import com.flowlyrent.repository.AdminNotificationRepository;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.ConciergeConfigRepository;
import com.flowlyrent.repository.ConciergeLeadRepository;
import com.flowlyrent.service.WebPushService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Page publique "Conciergerie" (/{slug}/conciergerie) — landing page B2B pour attirer des
 * propriétaires. Résolution du contenu + réception des demandes de contact.
 */
@RestController
@RequestMapping("/public/{slug}/concierge")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Conciergerie publique")
public class PublicConciergeController {

    private final AppUserRepository userRepo;
    private final ConciergeConfigRepository configRepo;
    private final ConciergeLeadRepository leadRepo;
    private final AdminNotificationRepository notifRepo;
    private final WebPushService webPushService;
    private final ObjectMapper objectMapper;

    @GetMapping("/info")
    public ResponseEntity<?> getInfo(@PathVariable String slug) {
        AppUser user = userRepo.findByPublicSiteSlug(slug).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        ConciergeConfig config = configRepo.findByUserId(user.getId()).orElse(null);
        if (config == null || !config.isEnabled()) return ResponseEntity.notFound().build();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("companyName", user.getCompanyName() != null ? user.getCompanyName() : "");
        m.put("companyLogoUrl", user.getCompanyLogoUrl() != null ? user.getCompanyLogoUrl() : "");
        m.put("firstName", user.getFirstName() != null ? user.getFirstName() : "");
        m.put("lastName", user.getLastName() != null ? user.getLastName() : "");
        m.put("phone", user.getPhone() != null ? user.getPhone() : "");
        m.put("email", user.getEmail() != null ? user.getEmail() : "");
        m.put("contactWhatsapp", config.getContactWhatsapp());
        m.put("heroTitle", config.getHeroTitle());
        m.put("heroSubtitle", config.getHeroSubtitle());
        m.put("heroImageUrl", config.getHeroImageUrl());
        m.put("pitch", config.getPitch());
        m.put("pricingText", config.getPricingText());
        m.put("ctaButtonText", config.getCtaButtonText());
        m.put("services", parseJsonList(config.getServicesJson()));
        m.put("stats", parseJsonList(config.getStatsJson()));
        m.put("steps", parseJsonList(config.getStepsJson()));
        m.put("testimonials", parseJsonList(config.getTestimonialsJson()));
        return ResponseEntity.ok(m);
    }

    @PostMapping("/leads")
    public ResponseEntity<?> createLead(@PathVariable String slug, @RequestBody Map<String, String> body) {
        AppUser user = userRepo.findByPublicSiteSlug(slug).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        ConciergeConfig config = configRepo.findByUserId(user.getId()).orElse(null);
        if (config == null || !config.isEnabled()) return ResponseEntity.notFound().build();

        String ownerName = body.getOrDefault("ownerName", "").trim();
        if (ownerName.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Nom requis"));

        ConciergeLead lead = new ConciergeLead();
        lead.setUser(user);
        lead.setOwnerName(ownerName);
        lead.setOwnerEmail(body.getOrDefault("ownerEmail", ""));
        lead.setOwnerPhone(body.getOrDefault("ownerPhone", ""));
        lead.setPropertyCity(body.getOrDefault("propertyCity", ""));
        lead.setMessage(body.getOrDefault("message", ""));
        leadRepo.save(lead);

        notifyHost(user, lead);

        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    private void notifyHost(AppUser user, ConciergeLead lead) {
        String excerpt = "Nouvelle demande de " + lead.getOwnerName()
                + (lead.getPropertyCity() != null && !lead.getPropertyCity().isBlank() ? " (" + lead.getPropertyCity() + ")" : "");

        try {
            webPushService.sendToUser(user.getId(),
                    "🏠 Nouvelle demande — Conciergerie",
                    excerpt,
                    "/admin/concierge");
        } catch (Exception e) {
            log.warn("[concierge] Push notification échouée : {}", e.getMessage());
        }

        try {
            AdminNotification notif = new AdminNotification();
            notif.setSubject("🏠 Nouvelle demande de propriétaire — Conciergerie");
            notif.setContent(excerpt + (lead.getMessage() != null && !lead.getMessage().isBlank() ? "\n\n" + lead.getMessage() : ""));
            notif.getTargetUsers().add(user);
            notifRepo.save(notif);
        } catch (Exception e) {
            log.warn("[concierge] Impossible de créer la AdminNotification : {}", e.getMessage());
        }
    }

    private List<Object> parseJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Object>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
