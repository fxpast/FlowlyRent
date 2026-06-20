package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.PricingZone;
import com.flowlyrent.model.PricingZonePeriod;
import com.flowlyrent.repository.PricingZonePeriodRepository;
import com.flowlyrent.repository.PricingZoneRepository;
import com.flowlyrent.repository.PropertyPricingConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/pricing-zones")
@RequiredArgsConstructor
public class AdminPricingZoneController {

    private final PricingZoneRepository zoneRepo;
    private final PricingZonePeriodRepository periodRepo;
    private final PropertyPricingConfigRepository propPricingRepo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public List<Map<String, Object>> list() {
        Long userId = securityUtils.getCurrentUserId();
        return zoneRepo.findByUserId(userId).stream().map(this::toMap).collect(Collectors.toList());
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        PricingZone zone = new PricingZone();
        zone.setUserId(securityUtils.getCurrentUserId());
        zone.setName((String) body.get("name"));
        zoneRepo.save(zone);
        if (body.containsKey("periods")) savePeriods(zone.getId(), body);
        return toMap(zone);
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        return zoneRepo.findById(id)
                .filter(z -> z.getUserId().equals(userId))
                .map(zone -> {
                    zone.setName((String) body.get("name"));
                    zoneRepo.save(zone);
                    periodRepo.deleteByZoneId(id);
                    if (body.containsKey("periods")) savePeriods(id, body);
                    return ResponseEntity.ok(toMap(zone));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        return zoneRepo.findById(id)
                .filter(z -> z.getUserId().equals(userId))
                .map(zone -> {
                    periodRepo.deleteByZoneId(id);
                    propPricingRepo.findByUserId(userId).stream()
                            .filter(c -> id.equals(c.getZoneId()))
                            .forEach(c -> { c.setZoneId(null); propPricingRepo.save(c); });
                    zoneRepo.delete(zone);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @SuppressWarnings("unchecked")
    private void savePeriods(Long zoneId, Map<String, Object> body) {
        List<Map<String, Object>> periods = (List<Map<String, Object>>) body.get("periods");
        if (periods == null) return;
        for (Map<String, Object> p : periods) {
            PricingZonePeriod period = new PricingZonePeriod();
            period.setZoneId(zoneId);
            period.setName((String) p.get("name"));
            period.setStartMonth(intVal(p, "startMonth"));
            period.setStartDay(intVal(p, "startDay"));
            period.setEndMonth(intVal(p, "endMonth"));
            period.setEndDay(intVal(p, "endDay"));
            period.setAdjustmentPercent(intVal(p, "adjustmentPercent"));
            periodRepo.save(period);
        }
    }

    private Map<String, Object> toMap(PricingZone z) {
        List<Map<String, Object>> periods = periodRepo.findByZoneId(z.getId()).stream()
                .map(p -> Map.<String, Object>of(
                        "id", p.getId(), "name", p.getName(),
                        "startMonth", p.getStartMonth(), "startDay", p.getStartDay(),
                        "endMonth", p.getEndMonth(), "endDay", p.getEndDay(),
                        "adjustmentPercent", p.getAdjustmentPercent()))
                .collect(Collectors.toList());
        return Map.of("id", z.getId(), "name", z.getName(), "periods", periods);
    }

    private int intVal(Map<String, Object> m, String k) {
        Object v = m.get(k);
        if (v == null) return 0;
        return v instanceof Number ? ((Number) v).intValue() : Integer.parseInt(v.toString());
    }
}
