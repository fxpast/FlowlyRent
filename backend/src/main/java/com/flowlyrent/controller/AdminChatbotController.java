package com.flowlyrent.controller;

import com.flowlyrent.service.GeminiChatbotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin/chatbot")
@RequiredArgsConstructor
@Slf4j
public class AdminChatbotController {

    private final GeminiChatbotService chatbotService;

    @PostMapping("/ask")
    public ResponseEntity<?> ask(@RequestBody Map<String, String> body) {
        try {
            String answer = chatbotService.ask(body.get("question"), body.getOrDefault("lang", "fr"));
            return ResponseEntity.ok(Map.of("answer", answer));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            log.error("Chatbot erreur : {}", e.getMessage());
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        }
    }
}
