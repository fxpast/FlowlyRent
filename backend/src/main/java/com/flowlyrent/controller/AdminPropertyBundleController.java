package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.PropertyBundle;
import com.flowlyrent.service.PropertyBundleService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/admin/property-bundles")
@RequiredArgsConstructor
@Tag(name = "Bundles de logements")
public class AdminPropertyBundleController {

    private final PropertyBundleService service;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<?> list() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (PropertyBundle b : service.list(securityUtils.getCurrentUserId())) {
            result.add(toMap(b));
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            PropertyBundle saved = service.create(securityUtils.getCurrentUserId(), fromBody(body));
            return ResponseEntity.ok(toMap(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            PropertyBundle saved = service.update(securityUtils.getCurrentUserId(), id, fromBody(body));
            return ResponseEntity.ok(toMap(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            service.delete(securityUtils.getCurrentUserId(), id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/run")
    public ResponseEntity<?> run(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.runNow(securityUtils.getCurrentUserId(), id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @SuppressWarnings("unchecked")
    private PropertyBundle fromBody(Map<String, Object> body) {
        PropertyBundle bundle = new PropertyBundle();
        bundle.setName(Objects.toString(body.get("name"), "").trim());
        bundle.setBundlePropertyId(Objects.toString(body.get("bundlePropertyId"), "").trim());
        bundle.setEnabled(!Boolean.FALSE.equals(body.get("enabled")));
        bundle.setHorizonDays(toInt(body.get("horizonDays"), 365));

        List<String> members = new ArrayList<>();
        Object raw = body.get("memberPropertyIds");
        if (raw instanceof List<?> list) {
            for (Object o : list) {
                if (o != null && !o.toString().isBlank()) members.add(o.toString().trim());
            }
        }
        bundle.setMemberPropertyIds(members);
        return bundle;
    }

    private int toInt(Object value, int fallback) {
        if (value == null) return fallback;
        try { return Integer.parseInt(value.toString()); } catch (NumberFormatException e) { return fallback; }
    }

    private Map<String, Object> toMap(PropertyBundle b) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", b.getId());
        m.put("name", b.getName());
        m.put("bundlePropertyId", b.getBundlePropertyId());
        m.put("memberPropertyIds", b.getMemberPropertyIds());
        m.put("enabled", b.isEnabled());
        m.put("horizonDays", b.getHorizonDays());
        m.put("lastRunAt", b.getLastRunAt() != null ? b.getLastRunAt().toString() : null);
        m.put("lastRunStatus", b.getLastRunStatus());
        return m;
    }
}
