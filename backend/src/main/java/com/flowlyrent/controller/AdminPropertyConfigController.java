package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.repository.PropertyConfigRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/admin/property-configs")
@RequiredArgsConstructor
@Tag(name = "Configuration des propriétés")
public class AdminPropertyConfigController {

    private final PropertyConfigRepository repo;
    private final SecurityUtils securityUtils;
    private final Random random = new Random();

    @GetMapping
    public ResponseEntity<List<PropertyConfig>> getAll() {
        return ResponseEntity.ok(repo.findByUserId(securityUtils.getCurrentUserId()));
    }

    @PutMapping("/{beds24PropertyId}")
    public ResponseEntity<PropertyConfig> upsert(
            @PathVariable String beds24PropertyId,
            @RequestBody Map<String, String> body) {
        AppUser user = securityUtils.getCurrentUser();
        PropertyConfig cfg = repo.findByUserIdAndBeds24PropertyId(user.getId(), beds24PropertyId)
                .orElseGet(() -> { PropertyConfig c = new PropertyConfig(); c.setUser(user); c.setBeds24PropertyId(beds24PropertyId); return c; });
        if (body.containsKey("shortName")) {
            String sn = body.get("shortName");
            cfg.setShortName(sn != null && !sn.isBlank() ? sn.trim() : null);
        }
        if (body.containsKey("accessCode")) {
            if (cfg.getAccessCode() != null && !cfg.getAccessCode().equals(body.get("accessCode")))
                cfg.setPreviousAccessCode(cfg.getAccessCode());
            cfg.setAccessCode(body.get("accessCode"));
        }
        if (body.containsKey("cleaningHours")) {
            String v = body.get("cleaningHours");
            cfg.setCleaningHours(v != null && !v.isBlank() ? Float.parseFloat(v) : null);
        }
        if (body.containsKey("cleaningFee")) {
            String v = body.get("cleaningFee");
            cfg.setCleaningFee(v != null && !v.isBlank() ? Float.parseFloat(v) : null);
        }
        if (body.containsKey("extraPersonThreshold")) {
            String v = body.get("extraPersonThreshold");
            cfg.setExtraPersonThreshold(v != null && !v.isBlank() ? Integer.parseInt(v) : null);
        }
        if (body.containsKey("extraPersonFee")) {
            String v = body.get("extraPersonFee");
            cfg.setExtraPersonFee(v != null && !v.isBlank() ? Float.parseFloat(v) : null);
        }
        if (body.containsKey("discount7Nights")) {
            String v = body.get("discount7Nights");
            cfg.setDiscount7Nights(v != null && !v.isBlank() ? Float.parseFloat(v) : null);
        }
        if (body.containsKey("discount28Nights")) {
            String v = body.get("discount28Nights");
            cfg.setDiscount28Nights(v != null && !v.isBlank() ? Float.parseFloat(v) : null);
        }
        return ResponseEntity.ok(repo.save(cfg));
    }

    @PostMapping("/{beds24PropertyId}/regenerate")
    public ResponseEntity<PropertyConfig> regenerate(@PathVariable String beds24PropertyId) {
        AppUser user = securityUtils.getCurrentUser();
        PropertyConfig cfg = repo.findByUserIdAndBeds24PropertyId(user.getId(), beds24PropertyId)
                .orElseGet(() -> { PropertyConfig c = new PropertyConfig(); c.setUser(user); c.setBeds24PropertyId(beds24PropertyId); return c; });
        if (cfg.getAccessCode() != null) cfg.setPreviousAccessCode(cfg.getAccessCode());
        cfg.setAccessCode(String.format("%04d", random.nextInt(10000)));
        return ResponseEntity.ok(repo.save(cfg));
    }
}
