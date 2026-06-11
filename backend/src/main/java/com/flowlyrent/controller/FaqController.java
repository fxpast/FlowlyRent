package com.flowlyrent.controller;

import com.flowlyrent.model.FaqItem;
import com.flowlyrent.repository.FaqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FaqController {

    private final FaqRepository faqRepository;

    @GetMapping("/public/faq")
    public List<FaqItem> getPublic() {
        return faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc();
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
        return ResponseEntity.ok(faqRepository.save(item));
    }

    @PutMapping("/superadmin/faq/{id}")
    public ResponseEntity<FaqItem> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return faqRepository.findById(id).map(item -> {
            if (body.containsKey("question")) item.setQuestion(body.get("question").toString().trim());
            if (body.containsKey("answer"))   item.setAnswer(body.get("answer").toString().trim());
            if (body.containsKey("displayOrder")) {
                item.setDisplayOrder(Integer.parseInt(body.get("displayOrder").toString()));
            }
            return ResponseEntity.ok(faqRepository.save(item));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/superadmin/faq/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!faqRepository.existsById(id)) return ResponseEntity.notFound().build();
        faqRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/superadmin/faq-import")
    public ResponseEntity<Map<String, Object>> importCsv(@RequestParam("file") MultipartFile file) {
        try {
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            if (content.startsWith("﻿")) content = content.substring(1); // BOM Excel

            String[] lines = content.split("\r?\n");
            if (lines.length == 0) return ResponseEntity.badRequest().body(Map.of("error", "Fichier vide"));

            char sep = lines[0].contains(";") ? ';' : ',';
            int startLine = lines[0].toLowerCase().contains("question") ? 1 : 0;

            int maxOrder = faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc()
                    .stream().mapToInt(FaqItem::getDisplayOrder).max().orElse(-1);

            int imported = 0, skipped = 0;
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
                faqRepository.save(item);
                imported++;
            }
            return ResponseEntity.ok(Map.of("imported", imported, "skipped", skipped));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
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
