package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.PropertyPricingConfig;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.PropertyPricingConfigRepository;
import com.flowlyrent.service.DynamicPricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/dynamic-pricing")
@RequiredArgsConstructor
public class AdminDynamicPricingController {

    private final DynamicPricingService pricingService;
    private final Beds24AccountRepository accountRepo;
    private final PropertyPricingConfigRepository propPricingRepo;
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
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/property-configs")
    public List<Map<String, Object>> getPropertyConfigs() {
        Long userId = securityUtils.getCurrentUserId();
        return propPricingRepo.findByUserId(userId).stream().map(this::toMap).collect(Collectors.toList());
    }

    @PostMapping("/property-configs")
    public ResponseEntity<?> savePropertyConfig(@RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        String propId = (String) body.get("beds24PropertyId");
        if (propId == null || propId.isBlank()) return ResponseEntity.badRequest().build();
        PropertyPricingConfig config = propPricingRepo
                .findByUserIdAndBeds24PropertyId(userId, propId)
                .orElseGet(() -> { PropertyPricingConfig c = new PropertyPricingConfig(); c.setUserId(userId); c.setBeds24PropertyId(propId); return c; });
        Object zoneId = body.get("zoneId");
        config.setZoneId(zoneId != null ? Long.parseLong(zoneId.toString()) : null);
        Object mMin = body.get("marketMin");
        config.setMarketMin(mMin != null && !mMin.toString().isBlank() ? new BigDecimal(mMin.toString()) : null);
        Object mMax = body.get("marketMax");
        config.setMarketMax(mMax != null && !mMax.toString().isBlank() ? new BigDecimal(mMax.toString()) : null);
        propPricingRepo.save(config);
        return ResponseEntity.ok(toMap(config));
    }

    private Map<String, Object> toMap(PropertyPricingConfig c) {
        return Map.of(
                "id", c.getId(),
                "beds24PropertyId", c.getBeds24PropertyId(),
                "zoneId", c.getZoneId() != null ? c.getZoneId() : "",
                "marketMin", c.getMarketMin() != null ? c.getMarketMin() : "",
                "marketMax", c.getMarketMax() != null ? c.getMarketMax() : "");
    }
}
