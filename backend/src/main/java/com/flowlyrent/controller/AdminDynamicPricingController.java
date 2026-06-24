package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.PricingEventImpactConfig;
import com.flowlyrent.model.PropertyPricingConfig;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.PricingEventImpactConfigRepository;
import com.flowlyrent.repository.PropertyPricingConfigRepository;
import com.flowlyrent.service.DynamicPricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/dynamic-pricing")
@RequiredArgsConstructor
@Slf4j
public class AdminDynamicPricingController {

    private final DynamicPricingService pricingService;
    private final Beds24AccountRepository accountRepo;
    private final PropertyPricingConfigRepository propPricingRepo;
    private final PricingEventImpactConfigRepository eventImpactConfigRepo;
    private final SecurityUtils securityUtils;

    @GetMapping("/suggestion")
    public ResponseEntity<?> getSuggestion(
            @RequestParam String propId,
            @RequestParam String startDate,
            @RequestParam String endDate) {
        try {
            Long userId = securityUtils.getCurrentUserId();
            Beds24Account account = accountRepo.findByAppUserId(userId)
                    .filter(Beds24Account::isConnected)
                    .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté"));
            return ResponseEntity.ok(pricingService.calculateSuggestion(userId, account, propId, startDate, endDate));
        } catch (Exception e) {
            log.error("[dynamic-pricing/suggestion] propId={} {}→{} — {}: {}", propId, startDate, endDate, e.getClass().getSimpleName(), e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/property-configs")
    public ResponseEntity<?> getPropertyConfigs() {
        try {
            Long userId = securityUtils.getCurrentUserId();
            List<Map<String, Object>> result = propPricingRepo.findByUserId(userId).stream()
                    .map(this::toMap).collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("[property-configs GET] {}: {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getClass().getSimpleName() + ": " + e.getMessage()));
        }
    }

    @PostMapping("/property-configs")
    public ResponseEntity<?> savePropertyConfig(@RequestBody Map<String, Object> body) {
        try {
            Long userId = securityUtils.getCurrentUserId();
            Object propIdRaw = body.get("beds24PropertyId");
            String propId = propIdRaw != null ? propIdRaw.toString() : null;
            if (propId == null || propId.isBlank()) return ResponseEntity.badRequest().build();
            PropertyPricingConfig config = propPricingRepo
                    .findByUserIdAndBeds24PropertyId(userId, propId)
                    .orElseGet(() -> {
                        PropertyPricingConfig c = new PropertyPricingConfig();
                        c.setUserId(userId);
                        c.setBeds24PropertyId(propId);
                        return c;
                    });
            Object zoneId = body.get("zoneId");
            String zoneStr = zoneId != null ? zoneId.toString().trim() : "";
            config.setZoneId(!zoneStr.isEmpty() && !zoneStr.equals("null") ? ((Number) new BigDecimal(zoneStr)).longValue() : null);
            Object mMin = body.get("marketMin");
            config.setMarketMin(mMin != null && !mMin.toString().isBlank() ? new BigDecimal(mMin.toString()) : null);
            Object mMax = body.get("marketMax");
            config.setMarketMax(mMax != null && !mMax.toString().isBlank() ? new BigDecimal(mMax.toString()) : null);
            PropertyPricingConfig saved = propPricingRepo.save(config);
            log.debug("[property-configs POST] saved propId={} id={}", propId, saved.getId());
            return ResponseEntity.ok(toMap(saved));
        } catch (Exception e) {
            log.error("[property-configs POST] {}: {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getClass().getSimpleName() + ": " + e.getMessage()));
        }
    }

    @GetMapping("/event-impact-config")
    public ResponseEntity<?> getEventImpactConfig() {
        Long userId = securityUtils.getCurrentUserId();
        PricingEventImpactConfig config = eventImpactConfigRepo.findByUserId(userId)
                .orElseGet(PricingEventImpactConfig::new);
        return ResponseEntity.ok(toMap(config));
    }

    @PutMapping("/event-impact-config")
    public ResponseEntity<?> saveEventImpactConfig(@RequestBody Map<String, Object> body) {
        try {
            Long userId = securityUtils.getCurrentUserId();
            PricingEventImpactConfig config = eventImpactConfigRepo.findByUserId(userId)
                    .orElseGet(() -> {
                        PricingEventImpactConfig c = new PricingEventImpactConfig();
                        c.setUserId(userId);
                        return c;
                    });
            if (body.get("faiblePercent") != null) config.setFaiblePercent(Integer.parseInt(body.get("faiblePercent").toString()));
            if (body.get("moyenPercent") != null) config.setMoyenPercent(Integer.parseInt(body.get("moyenPercent").toString()));
            if (body.get("fortPercent") != null) config.setFortPercent(Integer.parseInt(body.get("fortPercent").toString()));
            if (body.get("exceptionnelPercent") != null) config.setExceptionnelPercent(Integer.parseInt(body.get("exceptionnelPercent").toString()));
            return ResponseEntity.ok(toMap(eventImpactConfigRepo.save(config)));
        } catch (Exception e) {
            log.error("[event-impact-config PUT] {}: {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getClass().getSimpleName() + ": " + e.getMessage()));
        }
    }

    private Map<String, Object> toMap(PricingEventImpactConfig c) {
        Map<String, Object> m = new HashMap<>();
        m.put("faiblePercent", c.getFaiblePercent());
        m.put("moyenPercent", c.getMoyenPercent());
        m.put("exceptionnelPercent", c.getExceptionnelPercent());
        m.put("fortPercent", c.getFortPercent());
        return m;
    }

    private Map<String, Object> toMap(PropertyPricingConfig c) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", c.getId());
        m.put("beds24PropertyId", c.getBeds24PropertyId());
        m.put("zoneId", c.getZoneId());
        m.put("marketMin", c.getMarketMin());
        m.put("marketMax", c.getMarketMax());
        return m;
    }
}
