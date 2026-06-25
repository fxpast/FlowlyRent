package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AutoResponderConfig;
import com.flowlyrent.model.AutoResponderLog;
import com.flowlyrent.service.AutoResponderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/auto-responder")
@RequiredArgsConstructor
public class AdminAutoResponderController {

    private final AutoResponderService autoResponderService;
    private final SecurityUtils securityUtils;

    @GetMapping("/config")
    public ResponseEntity<?> getConfig() {
        Long userId = securityUtils.getCurrentUserId();
        AutoResponderConfig cfg = autoResponderService.getOrCreateConfig(userId);
        return ResponseEntity.ok(toDto(cfg));
    }

    @PutMapping("/config")
    public ResponseEntity<?> saveConfig(@RequestBody Map<String, Object> body) {
        try {
            Long userId = securityUtils.getCurrentUserId();
            AutoResponderConfig cfg = autoResponderService.getOrCreateConfig(userId);
            if (body.containsKey("enabled"))              cfg.setEnabled(Boolean.parseBoolean(body.get("enabled").toString()));
            if (body.containsKey("sensitiveKeywords"))    cfg.setSensitiveKeywords(strOrNull(body.get("sensitiveKeywords")));
            if (body.containsKey("transitionalMessage"))  cfg.setTransitionalMessage(strOrNull(body.get("transitionalMessage")));
            if (body.containsKey("systemPromptExtra"))    cfg.setSystemPromptExtra(strOrNull(body.get("systemPromptExtra")));
            return ResponseEntity.ok(toDto(autoResponderService.saveConfig(cfg)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/logs")
    public ResponseEntity<?> getLogs() {
        Long userId = securityUtils.getCurrentUserId();
        List<Map<String, Object>> logs = autoResponderService.getLogs(userId).stream()
                .map(this::logToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/default-keywords")
    public ResponseEntity<?> getDefaultKeywords() {
        return ResponseEntity.ok(Map.of("keywords", autoResponderService.getDefaultSensitiveKeywords()));
    }

    private Map<String, Object> toDto(AutoResponderConfig c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enabled",             c.isEnabled());
        m.put("sensitiveKeywords",   c.getSensitiveKeywords());
        m.put("transitionalMessage", c.getTransitionalMessage());
        m.put("systemPromptExtra",   c.getSystemPromptExtra());
        m.put("updatedAt",           c.getUpdatedAt());
        return m;
    }

    private Map<String, Object> logToDto(AutoResponderLog l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",                 l.getId());
        m.put("bookingId",          l.getBookingId());
        m.put("propertyId",         l.getPropertyId());
        m.put("classification",     l.getClassification());
        m.put("autoReplied",        l.isAutoReplied());
        m.put("guestMessageExcerpt",l.getGuestMessageExcerpt());
        m.put("createdAt",          l.getCreatedAt());
        return m;
    }

    private String strOrNull(Object v) {
        if (v == null) return null;
        String s = v.toString().trim();
        return s.isEmpty() ? null : s;
    }
}
