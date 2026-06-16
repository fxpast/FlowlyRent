package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.KeyBox;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.repository.KeyBoxRepository;
import com.flowlyrent.repository.PropertyConfigRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/property-configs")
@RequiredArgsConstructor
@Tag(name = "Configuration des propriétés")
public class AdminPropertyConfigController {

    private final PropertyConfigRepository repo;
    private final KeyBoxRepository keyBoxRepo;
    private final SecurityUtils securityUtils;
    private final Random random = new Random();

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        Long userId = securityUtils.getCurrentUserId();
        List<Map<String, Object>> result = repo.findByUserId(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{beds24PropertyId}")
    public ResponseEntity<Map<String, Object>> upsert(
            @PathVariable String beds24PropertyId,
            @RequestBody Map<String, String> body) {
        AppUser user = securityUtils.getCurrentUser();
        PropertyConfig cfg = repo.findByUserIdAndBeds24PropertyId(user.getId(), beds24PropertyId)
                .orElseGet(() -> { PropertyConfig c = new PropertyConfig(); c.setUser(user); c.setBeds24PropertyId(beds24PropertyId); return c; });

        if (body.containsKey("shortName")) {
            String sn = body.get("shortName");
            cfg.setShortName(sn != null && !sn.isBlank() ? sn.trim() : null);
        }
        if (body.containsKey("keyBoxId")) {
            String kbIdStr = body.get("keyBoxId");
            if (kbIdStr == null || kbIdStr.isBlank()) {
                cfg.setKeyBox(null);
            } else {
                Long kbId = Long.parseLong(kbIdStr);
                KeyBox kb = keyBoxRepo.findByIdAndUserId(kbId, user.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
                cfg.setKeyBox(kb);
            }
        }
        if (body.containsKey("accessCode")) {
            String newCode = body.get("accessCode");
            KeyBox kb = cfg.getKeyBox();
            if (kb != null) {
                // Mise à jour du code de la boîte partagée
                if (kb.getAccessCode() != null && !kb.getAccessCode().equals(newCode))
                    kb.setPreviousAccessCode(kb.getAccessCode());
                kb.setAccessCode(newCode);
                keyBoxRepo.save(kb);
            } else {
                if (cfg.getAccessCode() != null && !cfg.getAccessCode().equals(newCode))
                    cfg.setPreviousAccessCode(cfg.getAccessCode());
                cfg.setAccessCode(newCode);
            }
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
        return ResponseEntity.ok(toDto(repo.save(cfg)));
    }

    @PostMapping("/{beds24PropertyId}/regenerate")
    public ResponseEntity<Map<String, Object>> regenerate(@PathVariable String beds24PropertyId) {
        AppUser user = securityUtils.getCurrentUser();
        PropertyConfig cfg = repo.findByUserIdAndBeds24PropertyId(user.getId(), beds24PropertyId)
                .orElseGet(() -> { PropertyConfig c = new PropertyConfig(); c.setUser(user); c.setBeds24PropertyId(beds24PropertyId); return c; });
        String code = String.format("%04d", random.nextInt(10000));
        KeyBox kb = cfg.getKeyBox();
        if (kb != null) {
            if (kb.getAccessCode() != null) kb.setPreviousAccessCode(kb.getAccessCode());
            kb.setAccessCode(code);
            keyBoxRepo.save(kb);
        } else {
            if (cfg.getAccessCode() != null) cfg.setPreviousAccessCode(cfg.getAccessCode());
            cfg.setAccessCode(code);
            repo.save(cfg);
        }
        return ResponseEntity.ok(toDto(cfg));
    }

    private Map<String, Object> toDto(PropertyConfig cfg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("beds24PropertyId", cfg.getBeds24PropertyId());
        m.put("shortName", cfg.getShortName());
        KeyBox kb = cfg.getKeyBox();
        if (kb != null) {
            m.put("accessCode", kb.getAccessCode());
            m.put("previousAccessCode", kb.getPreviousAccessCode());
            m.put("keyBoxId", kb.getId());
            m.put("keyBoxName", kb.getName());
        } else {
            m.put("accessCode", cfg.getAccessCode());
            m.put("previousAccessCode", cfg.getPreviousAccessCode());
            m.put("keyBoxId", null);
            m.put("keyBoxName", null);
        }
        m.put("cleaningHours", cfg.getCleaningHours());
        m.put("cleaningFee", cfg.getCleaningFee());
        m.put("extraPersonThreshold", cfg.getExtraPersonThreshold());
        m.put("extraPersonFee", cfg.getExtraPersonFee());
        m.put("discount7Nights", cfg.getDiscount7Nights());
        m.put("discount28Nights", cfg.getDiscount28Nights());
        return m;
    }
}
