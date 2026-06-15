package com.flowlyrent.controller;

import com.flowlyrent.service.GeminiChatbotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/chatbot")
@RequiredArgsConstructor
@Slf4j
public class AdminChatbotController {

    private final GeminiChatbotService chatbotService;

    @PostMapping("/ask")
    public ResponseEntity<?> ask(@RequestBody Map<String, Object> body) {
        try {
            String question = (String) body.get("question");
            String lang = (String) body.getOrDefault("lang", "fr");
            @SuppressWarnings("unchecked")
            List<Map<String, String>> history = (List<Map<String, String>>) body.get("history");
            String answer = chatbotService.ask(question, lang, history);
            return ResponseEntity.ok(Map.of("answer", answer));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            log.error("Chatbot erreur : {}", e.getMessage());
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        }
    }
}
