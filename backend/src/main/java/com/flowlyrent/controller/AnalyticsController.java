package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.enums.AnalyticsEventType;
import com.flowlyrent.service.AnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final SecurityUtils securityUtils;

    @PostMapping("/track")
    public ResponseEntity<Void> track(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String typeStr = body.getOrDefault("type", "");
        String page = body.get("page");
        String ip = request.getRemoteAddr();

        AnalyticsEventType type;
        try {
            type = AnalyticsEventType.valueOf(typeStr);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }

        Long userId = null;
        try {
            userId = securityUtils.getCurrentUserId();
        } catch (Exception ignored) {}

        analyticsService.record(type, userId, page, ip);
        return ResponseEntity.ok().build();
    }
}
