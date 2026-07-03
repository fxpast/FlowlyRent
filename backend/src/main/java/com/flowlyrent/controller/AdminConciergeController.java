package com.flowlyrent.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.ConciergeConfig;
import com.flowlyrent.model.ConciergeLead;
import com.flowlyrent.model.enums.ConciergeLeadStatus;
import com.flowlyrent.repository.ConciergeConfigRepository;
import com.flowlyrent.repository.ConciergeLeadRepository;
import com.flowlyrent.service.CloudinaryService;
import com.flowlyrent.service.ConciergeTranslationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Configuration de la page publique "Conciergerie" (/{slug}/conciergerie) et gestion des
 * demandes de contact reçues des propriétaires intéressés.
 */
@RestController
@RequestMapping("/admin/concierge")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Conciergerie")
public class AdminConciergeController {

    private final ConciergeConfigRepository configRepo;
    private final ConciergeLeadRepository leadRepo;
    private final CloudinaryService cloudinaryService;
    private final ConciergeTranslationService translationService;
    private final SecurityUtils securityUtils;
    private final ObjectMapper objectMapper;

    // -------------------------------------------------------------------------
    // Configuration du contenu
    // -------------------------------------------------------------------------

    @GetMapping("/config")
    public ResponseEntity<?> getConfig() {
        Long userId = securityUtils.getCurrentUserId();
        ConciergeConfig config = configRepo.findByUserId(userId).orElseGet(ConciergeConfig::new);
        return ResponseEntity.ok(toDto(config));
    }

    @PutMapping("/config")
    public ResponseEntity<?> saveConfig(@RequestBody Map<String, Object> body) {
        try {
            Long userId = securityUtils.getCurrentUserId();
            ConciergeConfig config = configRepo.findByUserId(userId).orElseGet(() -> {
                ConciergeConfig c = new ConciergeConfig();
                c.setUserId(userId);
                return c;
            });

            if (body.containsKey("enabled")) config.setEnabled(Boolean.TRUE.equals(body.get("enabled")));
            if (body.containsKey("heroTitle")) config.setHeroTitle(str(body.get("heroTitle")));
            if (body.containsKey("heroSubtitle")) config.setHeroSubtitle(str(body.get("heroSubtitle")));
            if (body.containsKey("pitch")) config.setPitch(str(body.get("pitch")));
            if (body.containsKey("pricingText")) config.setPricingText(str(body.get("pricingText")));
            if (body.containsKey("contactWhatsapp")) config.setContactWhatsapp(str(body.get("contactWhatsapp")));
            if (body.containsKey("ctaButtonText")) config.setCtaButtonText(str(body.get("ctaButtonText")));

            if (body.containsKey("services")) config.setServicesJson(objectMapper.writeValueAsString(body.get("services")));
            if (body.containsKey("stats")) config.setStatsJson(objectMapper.writeValueAsString(body.get("stats")));
            if (body.containsKey("steps")) config.setStepsJson(objectMapper.writeValueAsString(body.get("steps")));
            if (body.containsKey("testimonials")) config.setTestimonialsJson(objectMapper.writeValueAsString(body.get("testimonials")));

            configRepo.save(config);

            List<String> translatableKeys = List.of("heroTitle", "heroSubtitle", "pitch", "pricingText",
                    "ctaButtonText", "services", "stats", "steps", "testimonials");
            if (translatableKeys.stream().anyMatch(body::containsKey)) {
                translationService.translateAsync(config.getId());
            }

            return ResponseEntity.ok(toDto(config));
        } catch (Exception e) {
            log.error("[concierge] Erreur sauvegarde config : {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/hero-image")
    public ResponseEntity<?> uploadHeroImage(@RequestBody Map<String, String> body) {
        try {
            Long userId = securityUtils.getCurrentUserId();
            String base64Data = body.getOrDefault("data", "");
            if (base64Data.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Image manquante"));

            ConciergeConfig config = configRepo.findByUserId(userId).orElseGet(() -> {
                ConciergeConfig c = new ConciergeConfig();
                c.setUserId(userId);
                return c;
            });

            String previousPublicId = config.getHeroImagePublicId();

            Map<?, ?> result = cloudinaryService.uploadBase64(base64Data, "flowlyrent/concierge/" + userId);
            config.setHeroImageUrl(result.get("secure_url").toString());
            config.setHeroImagePublicId(result.get("public_id").toString());
            configRepo.save(config);

            if (previousPublicId != null && !previousPublicId.isBlank()) {
                try { cloudinaryService.delete(previousPublicId); } catch (Exception ignored) {}
            }

            return ResponseEntity.ok(toDto(config));
        } catch (Exception e) {
            log.error("[concierge] Erreur upload image hero : {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // Demandes de contact (leads)
    // -------------------------------------------------------------------------

    @GetMapping("/leads")
    public ResponseEntity<List<Map<String, Object>>> getLeads() {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(leadRepo.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toLeadDto).collect(Collectors.toList()));
    }

    @PutMapping("/leads/{id}")
    public ResponseEntity<?> updateLeadStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Long userId = securityUtils.getCurrentUserId();
        ConciergeLead lead = leadRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        String statusStr = body.get("status");
        if (statusStr != null) {
            try {
                lead.setStatus(ConciergeLeadStatus.valueOf(statusStr));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Statut invalide"));
            }
        }
        leadRepo.save(lead);
        return ResponseEntity.ok(toLeadDto(lead));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private String str(Object v) {
        return v == null ? null : v.toString();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toDto(ConciergeConfig c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enabled", c.isEnabled());
        m.put("heroTitle", c.getHeroTitle());
        m.put("heroSubtitle", c.getHeroSubtitle());
        m.put("heroImageUrl", c.getHeroImageUrl());
        m.put("pitch", c.getPitch());
        m.put("pricingText", c.getPricingText());
        m.put("contactWhatsapp", c.getContactWhatsapp());
        m.put("ctaButtonText", c.getCtaButtonText());
        m.put("services", parseJsonList(c.getServicesJson()));
        m.put("stats", parseJsonList(c.getStatsJson()));
        m.put("steps", parseJsonList(c.getStepsJson()));
        m.put("testimonials", parseJsonList(c.getTestimonialsJson()));
        return m;
    }

    private List<Object> parseJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<List<Object>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private Map<String, Object> toLeadDto(ConciergeLead l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", l.getId());
        m.put("ownerName", l.getOwnerName());
        m.put("ownerEmail", l.getOwnerEmail());
        m.put("ownerPhone", l.getOwnerPhone());
        m.put("propertyCity", l.getPropertyCity());
        m.put("message", l.getMessage());
        m.put("status", l.getStatus().name());
        m.put("createdAt", l.getCreatedAt());
        return m;
    }
}
