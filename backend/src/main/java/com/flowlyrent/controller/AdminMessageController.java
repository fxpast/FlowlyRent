package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.service.MessageAssistService;
import com.flowlyrent.service.MessageService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/messages")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin - Messages")
public class AdminMessageController {

    private final MessageService messageService;
    private final MessageAssistService messageAssistService;
    private final SecurityUtils securityUtils;

    @GetMapping("/{bookingId}")
    public ResponseEntity<?> getMessages(@PathVariable String bookingId) {
        try {
            Long userId = securityUtils.getCurrentUserId();
            return ResponseEntity.ok(messageService.getMessages(userId, bookingId));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PostMapping("/{bookingId}")
    public ResponseEntity<?> sendMessage(@PathVariable String bookingId,
                                         @RequestBody Map<String, String> body) {
        try {
            Long userId = securityUtils.getCurrentUserId();
            String content = body.get("content");
            if (content == null || content.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Contenu vide"));
            }
            return ResponseEntity.ok(messageService.sendMessage(userId, bookingId, content));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PostMapping("/{bookingId}/ai-assist")
    public ResponseEntity<?> aiAssist(@PathVariable String bookingId,
                                       @RequestBody Map<String, String> body) {
        try {
            Long userId = securityUtils.getCurrentUserId();
            String draft = body.getOrDefault("draft", "");
            String text = messageAssistService.assist(userId, bookingId, draft);
            return ResponseEntity.ok(Map.of("text", text));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/unread-count")
    public Map<String, Long> getUnreadCount() {
        return Map.of("count", 0L);
    }

    private ResponseEntity<Map<String, String>> error(Exception e) {
        log.warn("[Messages] Erreur : {}", e.getMessage());
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
