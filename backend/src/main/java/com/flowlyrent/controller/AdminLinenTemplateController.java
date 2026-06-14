package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.LinenTemplate;
import com.flowlyrent.model.LinenTemplateItem;
import com.flowlyrent.model.enums.LinenCategory;
import com.flowlyrent.service.LinenTemplateService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/admin/linen/templates")
@RequiredArgsConstructor
@Tag(name = "Modèles de linge")
public class AdminLinenTemplateController {

    private final LinenTemplateService service;
    private final SecurityUtils securityUtils;

    @GetMapping
    public List<Map<String, Object>> list() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (LinenTemplate t : service.list(securityUtils.getCurrentUserId())) {
            result.add(toMap(t));
        }
        return result;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            LinenTemplate saved = service.create(securityUtils.getCurrentUserId(), fromBody(body));
            return ResponseEntity.ok(toMap(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            LinenTemplate saved = service.update(securityUtils.getCurrentUserId(), id, fromBody(body));
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

    @SuppressWarnings("unchecked")
    @PostMapping("/{id}/apply")
    public ResponseEntity<?> apply(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            List<String> propertyIds = new ArrayList<>();
            Object rawIds = body.get("beds24PropertyIds");
            if (rawIds instanceof List<?> list) {
                for (Object o : list) {
                    if (o != null && !o.toString().isBlank()) propertyIds.add(o.toString().trim());
                }
            }

            Map<String, String> propertyNames = new HashMap<>();
            Object rawNames = body.get("propertyNames");
            if (rawNames instanceof Map<?, ?> map) {
                for (Map.Entry<?, ?> e : map.entrySet()) {
                    if (e.getKey() != null && e.getValue() != null) {
                        propertyNames.put(e.getKey().toString(), e.getValue().toString());
                    }
                }
            }

            int updated = service.apply(securityUtils.getCurrentUserId(), id, propertyIds, propertyNames);
            return ResponseEntity.ok(Map.of("success", true, "itemsUpdated", updated));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @SuppressWarnings("unchecked")
    private LinenTemplate fromBody(Map<String, Object> body) {
        LinenTemplate template = new LinenTemplate();
        template.setName(Objects.toString(body.get("name"), "").trim());

        Object rawItems = body.get("items");
        if (rawItems instanceof List<?> list) {
            for (Object o : list) {
                if (!(o instanceof Map<?, ?> itemBody)) continue;
                LinenTemplateItem item = new LinenTemplateItem();
                item.setLabel(Objects.toString(itemBody.get("label"), "").trim());
                item.setCategory(itemBody.get("category") != null
                        ? LinenCategory.valueOf(itemBody.get("category").toString())
                        : LinenCategory.AUTRE);
                item.setTotalQuantity(toInt(itemBody.get("totalQuantity"), 0));
                item.setMinThreshold(itemBody.get("minThreshold") != null ? toInt(itemBody.get("minThreshold"), 0) : null);
                item.setDefaultPerCleaning(itemBody.get("defaultPerCleaning") != null ? toInt(itemBody.get("defaultPerCleaning"), 0) : null);
                template.getItems().add(item);
            }
        }
        return template;
    }

    private int toInt(Object value, int fallback) {
        if (value == null) return fallback;
        try { return Integer.parseInt(value.toString()); } catch (NumberFormatException e) { return fallback; }
    }

    private Map<String, Object> toMap(LinenTemplate t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("name", t.getName());
        List<Map<String, Object>> items = new ArrayList<>();
        for (LinenTemplateItem ti : t.getItems()) {
            Map<String, Object> im = new LinkedHashMap<>();
            im.put("id", ti.getId());
            im.put("label", ti.getLabel());
            im.put("category", ti.getCategory());
            im.put("totalQuantity", ti.getTotalQuantity());
            im.put("minThreshold", ti.getMinThreshold());
            im.put("defaultPerCleaning", ti.getDefaultPerCleaning());
            im.put("sortOrder", ti.getSortOrder());
            items.add(im);
        }
        m.put("items", items);
        return m;
    }
}
