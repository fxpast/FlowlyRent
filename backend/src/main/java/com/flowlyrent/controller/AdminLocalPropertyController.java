package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.LocalProperty;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.repository.IcalBookingRepository;
import com.flowlyrent.repository.LocalPropertyRepository;
import com.flowlyrent.repository.PropertyConfigRepository;
import com.flowlyrent.service.IcalSyncService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/local-properties")
@RequiredArgsConstructor
@Tag(name = "Logements locaux (iCal)")
public class AdminLocalPropertyController {

    private final LocalPropertyRepository localPropertyRepo;
    private final IcalBookingRepository icalBookingRepo;
    private final PropertyConfigRepository propertyConfigRepo;
    private final IcalSyncService icalSyncService;
    private final SecurityUtils securityUtils;

    @PostConstruct
    public void fillMissingFeedTokens() {
        localPropertyRepo.findAll().stream()
            .filter(p -> p.getIcalFeedToken() == null)
            .forEach(p -> {
                p.setIcalFeedToken(java.util.UUID.randomUUID().toString());
                localPropertyRepo.save(p);
            });
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        Long userId = securityUtils.getCurrentUserId();
        List<Map<String, Object>> result = localPropertyRepo.findByUserIdOrderByCreatedAtAsc(userId)
                .stream().map(this::toMap).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Nom requis"));

        AppUser user = securityUtils.getCurrentUser();
        LocalProperty prop = new LocalProperty();
        prop.setUser(user);
        prop.setName(name.trim());
        prop.setShortName(body.getOrDefault("shortName", "").trim());
        prop.setIcalUrl(body.getOrDefault("icalUrl", "").trim());
        LocalProperty saved = localPropertyRepo.save(prop);
        String savedId = saved.getId().toString();

        // Auto-création PropertyConfig pour que les autres modules fonctionnent
        PropertyConfig cfg = propertyConfigRepo
                .findByUserIdAndBeds24PropertyId(user.getId(), savedId)
                .orElseGet(() -> {
                    PropertyConfig c = new PropertyConfig();
                    c.setUser(user);
                    c.setBeds24PropertyId(savedId);
                    return c;
                });
        if (cfg.getShortName() == null || cfg.getShortName().isBlank()) {
            cfg.setShortName(saved.getShortName());
        }
        propertyConfigRepo.save(cfg);

        return ResponseEntity.ok(toMap(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Long userId = securityUtils.getCurrentUserId();
        LocalProperty prop = localPropertyRepo.findByIdAndUserId(id, userId)
                .orElse(null);
        if (prop == null) return ResponseEntity.notFound().build();

        if (body.containsKey("name") && !body.get("name").isBlank()) prop.setName(body.get("name").trim());
        if (body.containsKey("shortName")) prop.setShortName(body.get("shortName").trim());
        if (body.containsKey("icalUrl")) prop.setIcalUrl(body.get("icalUrl").trim());
        localPropertyRepo.save(prop);
        return ResponseEntity.ok(toMap(prop));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        LocalProperty prop = localPropertyRepo.findByIdAndUserId(id, userId)
                .orElse(null);
        if (prop == null) return ResponseEntity.notFound().build();

        icalBookingRepo.deleteByLocalPropertyId(id);
        localPropertyRepo.delete(prop);
        return ResponseEntity.ok(Map.of("status", "supprimé"));
    }

    @PostMapping("/{id}/sync")
    public ResponseEntity<?> sync(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        LocalProperty prop = localPropertyRepo.findByIdAndUserId(id, userId)
                .orElse(null);
        if (prop == null) return ResponseEntity.notFound().build();
        if (prop.getIcalUrl() == null || prop.getIcalUrl().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Aucune URL iCal configurée"));
        }
        try {
            icalSyncService.syncProperty(prop);
            return ResponseEntity.ok(Map.of("status", "sync terminée"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/regenerate-token")
    public ResponseEntity<?> regenerateToken(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        LocalProperty prop = localPropertyRepo.findByIdAndUserId(id, userId).orElse(null);
        if (prop == null) return ResponseEntity.notFound().build();
        prop.setIcalFeedToken(java.util.UUID.randomUUID().toString());
        localPropertyRepo.save(prop);
        return ResponseEntity.ok(toMap(prop));
    }

    private Map<String, Object> toMap(LocalProperty p) {
        java.util.Map<String, Object> m = new java.util.HashMap<>();
        m.put("id", p.getId().toString());
        m.put("name", p.getName());
        m.put("shortName", p.getShortName() != null ? p.getShortName() : "");
        m.put("icalUrl", p.getIcalUrl() != null ? p.getIcalUrl() : "");
        m.put("icalFeedToken", p.getIcalFeedToken() != null ? p.getIcalFeedToken() : "");
        return m;
    }
}
