package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.MinStayStrategy;
import com.flowlyrent.service.MinStayStrategyService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin/min-stay")
@RequiredArgsConstructor
@Tag(name = "Stratégie durée minimum de séjour")
public class AdminMinStayController {

    private final MinStayStrategyService service;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<?> get() {
        return ResponseEntity.ok(toMap(service.getOrDefault(securityUtils.getCurrentUserId())));
    }

    @PutMapping
    public ResponseEntity<?> save(@RequestBody Map<String, Object> body) {
        MinStayStrategy form = new MinStayStrategy();
        form.setEnabled(Boolean.TRUE.equals(body.get("enabled")));
        form.setNearDays(toInt(body.get("nearDays"), 10));
        form.setNearMinStay(toInt(body.get("nearMinStay"), 2));
        form.setFarMinStay(toInt(body.get("farMinStay"), 3));
        form.setHorizonDays(toInt(body.get("horizonDays"), 365));

        MinStayStrategy saved = service.save(securityUtils.getCurrentUserId(), form);
        return ResponseEntity.ok(toMap(saved));
    }

    @PostMapping("/run")
    public ResponseEntity<?> run() {
        try {
            return ResponseEntity.ok(service.runNow(securityUtils.getCurrentUserId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private int toInt(Object value, int fallback) {
        if (value == null) return fallback;
        return Integer.parseInt(value.toString());
    }

    private Map<String, Object> toMap(MinStayStrategy s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enabled", s.isEnabled());
        m.put("nearDays", s.getNearDays());
        m.put("nearMinStay", s.getNearMinStay());
        m.put("farMinStay", s.getFarMinStay());
        m.put("horizonDays", s.getHorizonDays());
        m.put("lastRunAt", s.getLastRunAt() != null ? s.getLastRunAt().toString() : null);
        m.put("lastRunStatus", s.getLastRunStatus());
        return m;
    }
}
