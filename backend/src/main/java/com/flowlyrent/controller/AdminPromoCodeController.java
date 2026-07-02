package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.PromoCode;
import com.flowlyrent.repository.PromoCodeRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Codes promo par logement, utilisables par les voyageurs sur le site de réservation public.
 */
@RestController
@RequestMapping("/admin/promo-codes")
@RequiredArgsConstructor
@Tag(name = "Codes promo")
public class AdminPromoCodeController {

    private final PromoCodeRepository repo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(repo.findByUserId(userId).stream().map(this::toDto).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        AppUser user = securityUtils.getCurrentUser();

        String beds24PropertyId = body.get("beds24PropertyId") != null ? body.get("beds24PropertyId").toString().trim() : "";
        String code = body.get("code") != null ? body.get("code").toString().trim().toUpperCase() : "";
        Integer discountPercent = body.get("discountPercent") instanceof Number n ? n.intValue() : null;

        if (beds24PropertyId.isBlank() || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Logement et code requis"));
        }
        if (discountPercent == null || discountPercent < 1 || discountPercent > 100) {
            return ResponseEntity.badRequest().body(Map.of("error", "Remise invalide (1 à 100%)"));
        }

        PromoCode pc = new PromoCode();
        pc.setUser(user);
        pc.setBeds24PropertyId(beds24PropertyId);
        pc.setCode(code);
        pc.setDiscountPercent(discountPercent);
        pc.setActive(true);

        try {
            repo.save(pc);
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ce code existe déjà"));
        }
        return ResponseEntity.ok(toDto(pc));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        PromoCode pc = repo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (body.containsKey("code")) {
            String code = body.get("code") != null ? body.get("code").toString().trim().toUpperCase() : "";
            if (code.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Code requis"));
            pc.setCode(code);
        }
        if (body.containsKey("discountPercent")) {
            Integer discountPercent = body.get("discountPercent") instanceof Number n ? n.intValue() : null;
            if (discountPercent == null || discountPercent < 1 || discountPercent > 100) {
                return ResponseEntity.badRequest().body(Map.of("error", "Remise invalide (1 à 100%)"));
            }
            pc.setDiscountPercent(discountPercent);
        }
        if (body.containsKey("active")) {
            pc.setActive(Boolean.TRUE.equals(body.get("active")));
        }

        try {
            repo.save(pc);
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ce code existe déjà"));
        }
        return ResponseEntity.ok(toDto(pc));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        PromoCode pc = repo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        repo.delete(pc);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toDto(PromoCode pc) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", pc.getId());
        m.put("beds24PropertyId", pc.getBeds24PropertyId());
        m.put("code", pc.getCode());
        m.put("discountPercent", pc.getDiscountPercent());
        m.put("active", pc.isActive());
        m.put("usageCount", pc.getUsageCount());
        return m;
    }
}
