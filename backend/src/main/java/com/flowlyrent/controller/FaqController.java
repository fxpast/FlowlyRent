package com.flowlyrent.controller;

import com.flowlyrent.model.FaqItem;
import com.flowlyrent.model.FaqSuggestion;
import com.flowlyrent.repository.FaqRepository;
import com.flowlyrent.repository.FaqSuggestionRepository;
import com.flowlyrent.service.FaqTranslationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FaqController {

    private final FaqRepository faqRepository;
    private final FaqSuggestionRepository faqSuggestionRepository;
    private final FaqTranslationService translationService;

    @GetMapping("/public/faq")
    public List<Map<String, Object>> getPublic(@RequestParam(defaultValue = "fr") String lang) {
        return faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc()
                .stream()
                .map(item -> toDto(item, lang))
                .toList();
    }

    @GetMapping("/superadmin/faq")
    public List<FaqItem> getAll() {
        return faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc();
    }

    @PostMapping("/superadmin/faq")
    public ResponseEntity<FaqItem> create(@RequestBody Map<String, Object> body) {
        FaqItem item = new FaqItem();
        item.setQuestion(body.getOrDefault("question", "").toString().trim());
        item.setAnswer(body.getOrDefault("answer", "").toString().trim());
        if (item.getQuestion().isBlank() || item.getAnswer().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        int maxOrder = faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc()
                .stream().mapToInt(FaqItem::getDisplayOrder).max().orElse(-1);
        item.setDisplayOrder(maxOrder + 1);
        FaqItem saved = faqRepository.save(item);
        translationService.translateAsync(saved);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/superadmin/faq/{id}")
    public ResponseEntity<FaqItem> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return faqRepository.findById(id).map(item -> {
            boolean contentChanged = false;
            if (body.containsKey("question")) {
                item.setQuestion(body.get("question").toString().trim());
                contentChanged = true;
            }
            if (body.containsKey("answer")) {
                item.setAnswer(body.get("answer").toString().trim());
                contentChanged = true;
            }
            if (body.containsKey("displayOrder")) {
                item.setDisplayOrder(Integer.parseInt(body.get("displayOrder").toString()));
            }
            FaqItem saved = faqRepository.save(item);
            if (contentChanged) translationService.translateAsync(saved);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/superadmin/faq/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!faqRepository.existsById(id)) return ResponseEntity.notFound().build();
        faqRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/superadmin/faq/retranslate")
    public ResponseEntity<Map<String, Object>> retranslateAll() {
        int count = faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc().size();
        translationService.translateAllAsync();
        return ResponseEntity.ok(Map.of("message", "Traduction lancée en arrière-plan", "count", count));
    }

    @GetMapping("/superadmin/faq-suggestions")
    public List<FaqSuggestion> getSuggestions() {
        return faqSuggestionRepository.findAllByOrderByCreatedAtDesc();
    }

    @PostMapping("/superadmin/faq-suggestions/{id}/approve")
    public ResponseEntity<FaqItem> approveSuggestion(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        FaqSuggestion suggestion = faqSuggestionRepository.findById(id).orElse(null);
        if (suggestion == null) return ResponseEntity.notFound().build();

        String question = body.getOrDefault("question", suggestion.getQuestion()).toString().trim();
        String answer = body.getOrDefault("answer", suggestion.getAnswer()).toString().trim();
        if (question.isBlank() || answer.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        FaqItem item = new FaqItem();
        item.setQuestion(question);
        item.setAnswer(answer);
        int maxOrder = faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc()
                .stream().mapToInt(FaqItem::getDisplayOrder).max().orElse(-1);
        item.setDisplayOrder(maxOrder + 1);
        FaqItem saved = faqRepository.save(item);
        translationService.translateAsync(saved);

        faqSuggestionRepository.delete(suggestion);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/superadmin/faq-suggestions/{id}")
    public ResponseEntity<Void> rejectSuggestion(@PathVariable Long id) {
        if (!faqSuggestionRepository.existsById(id)) return ResponseEntity.notFound().build();
        faqSuggestionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/superadmin/faq-import")
    public ResponseEntity<Map<String, Object>> importCsv(@RequestParam("file") MultipartFile file) {
        try {
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            if (content.startsWith("﻿")) content = content.substring(1);

            String[] lines = content.split("\r?\n");
            if (lines.length == 0) return ResponseEntity.badRequest().body(Map.of("error", "Fichier vide"));

            char sep = lines[0].contains(";") ? ';' : ',';
            int startLine = lines[0].toLowerCase().contains("question") ? 1 : 0;

            int maxOrder = faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc()
                    .stream().mapToInt(FaqItem::getDisplayOrder).max().orElse(-1);

            int imported = 0, skipped = 0;
            List<FaqItem> saved = new ArrayList<>();
            for (int i = startLine; i < lines.length; i++) {
                String line = lines[i].trim();
                if (line.isEmpty()) continue;
                List<String> fields = parseCsvLine(line, sep);
                if (fields.size() < 2) { skipped++; continue; }
                String question = fields.get(0).trim();
                String answer   = fields.get(1).trim();
                if (question.isEmpty() || answer.isEmpty()) { skipped++; continue; }
                FaqItem item = new FaqItem();
                item.setQuestion(question);
                item.setAnswer(answer);
                item.setDisplayOrder(++maxOrder);
                saved.add(faqRepository.save(item));
                imported++;
            }
            saved.forEach(translationService::translateAsync);
            return ResponseEntity.ok(Map.of("imported", imported, "skipped", skipped));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Map<String, Object> toDto(FaqItem item, String lang) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", item.getId());
        dto.put("question", switch (lang) {
            case "en" -> nvl(item.getQuestionEn(), item.getQuestion());
            case "es" -> nvl(item.getQuestionEs(), item.getQuestion());
            case "de" -> nvl(item.getQuestionDe(), item.getQuestion());
            case "it" -> nvl(item.getQuestionIt(), item.getQuestion());
            default   -> item.getQuestion();
        });
        dto.put("answer", switch (lang) {
            case "en" -> nvl(item.getAnswerEn(), item.getAnswer());
            case "es" -> nvl(item.getAnswerEs(), item.getAnswer());
            case "de" -> nvl(item.getAnswerDe(), item.getAnswer());
            case "it" -> nvl(item.getAnswerIt(), item.getAnswer());
            default   -> item.getAnswer();
        });
        dto.put("displayOrder", item.getDisplayOrder());
        return dto;
    }

    private String nvl(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }

    private List<String> parseCsvLine(String line, char sep) {
        List<String> fields = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"' && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    field.append('"'); i++;
                } else if (c == '"') {
                    inQuotes = false;
                } else {
                    field.append(c);
                }
            } else {
                if (c == '"') { inQuotes = true; }
                else if (c == sep) { fields.add(field.toString()); field = new StringBuilder(); }
                else { field.append(c); }
            }
        }
        fields.add(field.toString());
        return fields;
    }
}
