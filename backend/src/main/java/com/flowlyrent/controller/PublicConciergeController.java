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
    public ResponseEntity<?> getInfo(@PathVariable String slug,
                                      @RequestParam(required = false, defaultValue = "fr") String lang) {
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
        m.put("heroImageUrl", config.getHeroImageUrl());
        m.putAll(resolveContent(config, lang));
        return ResponseEntity.ok(m);
    }

    /**
     * Contenu traduisible (hero titre/sous-titre, pitch, tarification, CTA, listes) — résolu
     * dans la langue demandée depuis ConciergeConfig.translationsJson (ConciergeTranslationService),
     * avec repli sur le français champ par champ si la traduction est absente/vide.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> resolveContent(ConciergeConfig config, String lang) {
        Map<String, Object> fr = new LinkedHashMap<>();
        fr.put("heroTitle", config.getHeroTitle());
        fr.put("heroSubtitle", config.getHeroSubtitle());
        fr.put("pitch", config.getPitch());
        fr.put("pricingText", config.getPricingText());
        fr.put("ctaButtonText", config.getCtaButtonText());
        fr.put("services", parseJsonList(config.getServicesJson()));
        fr.put("stats", parseJsonList(config.getStatsJson()));
        fr.put("steps", parseJsonList(config.getStepsJson()));
        fr.put("testimonials", parseJsonList(config.getTestimonialsJson()));

        if (lang == null || lang.isBlank() || "fr".equalsIgnoreCase(lang) || config.getTranslationsJson() == null) {
            return fr;
        }

        try {
            Map<String, Object> allTranslations = objectMapper.readValue(
                    config.getTranslationsJson(), new TypeReference<Map<String, Object>>() {});
            Object langData = allTranslations.get(lang.toLowerCase());
            if (langData instanceof Map<?, ?> map) {
                Map<String, Object> merged = new LinkedHashMap<>(fr);
                for (Map.Entry<?, ?> e : map.entrySet()) {
                    Object v = e.getValue();
                    boolean hasContent = v != null
                            && (!(v instanceof String s) || !s.isBlank())
                            && (!(v instanceof List<?> l) || !l.isEmpty());
                    if (hasContent) merged.put(e.getKey().toString(), v);
                }
                return merged;
            }
        } catch (Exception e) {
            log.debug("[concierge] Résolution traduction impossible : {}", e.getMessage());
        }
        return fr;
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
