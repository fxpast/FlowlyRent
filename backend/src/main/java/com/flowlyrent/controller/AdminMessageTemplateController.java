package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.MessageTemplate;
import com.flowlyrent.repository.MessageTemplateRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/message-templates")
@RequiredArgsConstructor
@Tag(name = "Modèles de messages")
public class AdminMessageTemplateController {

    private final MessageTemplateRepository repo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<MessageTemplate>> getAll() {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(repo.findByUserIdAndActiveTrue(userId));
    }

    @PostMapping
    public ResponseEntity<MessageTemplate> create(@RequestBody Map<String, Object> body) {
        AppUser user = securityUtils.getCurrentUser();
        MessageTemplate t = new MessageTemplate();
        t.setUser(user);
        applyBody(t, body);
        return ResponseEntity.ok(repo.save(t));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        return repo.findById(id)
            .filter(t -> t.getUser().getId().equals(userId))
            .map(t -> { applyBody(t, body); return ResponseEntity.ok(repo.save(t)); })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        return repo.findById(id)
            .filter(t -> t.getUser().getId().equals(userId))
            .map(t -> { t.setActive(false); repo.save(t); return ResponseEntity.noContent().build(); })
            .orElse(ResponseEntity.notFound().build());
    }

    private void applyBody(MessageTemplate t, Map<String, Object> body) {
        if (body.containsKey("name"))             t.setName((String) body.get("name"));
        if (body.containsKey("type"))             t.setType((String) body.get("type"));
        if (body.containsKey("beds24PropertyId")) t.setBeds24PropertyId((String) body.get("beds24PropertyId"));
        if (body.containsKey("contentFr"))        t.setContentFr((String) body.get("contentFr"));
        if (body.containsKey("contentEn"))        t.setContentEn((String) body.get("contentEn"));
        if (body.containsKey("channel"))          t.setChannel((String) body.get("channel"));
    }
}
