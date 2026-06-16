package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.KeyBox;
import com.flowlyrent.repository.KeyBoxRepository;
import com.flowlyrent.repository.PropertyConfigRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/admin/key-boxes")
@RequiredArgsConstructor
@Tag(name = "Boîtes à clef")
public class AdminKeyBoxController {

    private final KeyBoxRepository repo;
    private final PropertyConfigRepository propConfigRepo;
    private final SecurityUtils securityUtils;
    private final Random random = new Random();

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        Long userId = securityUtils.getCurrentUserId();
        List<Map<String, Object>> result = repo.findByUserId(userId).stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, String> body) {
        AppUser user = securityUtils.getCurrentUser();
        String name = body.get("name");
        if (name == null || name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nom requis");
        KeyBox kb = new KeyBox();
        kb.setUser(user);
        kb.setName(name.trim());
        if (body.containsKey("accessCode") && body.get("accessCode") != null && !body.get("accessCode").isBlank()) {
            kb.setAccessCode(body.get("accessCode").trim());
        }
        return ResponseEntity.ok(toDto(repo.save(kb)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        KeyBox kb = requireOwned(id);
        if (body.containsKey("name") && body.get("name") != null && !body.get("name").isBlank()) {
            kb.setName(body.get("name").trim());
        }
        if (body.containsKey("accessCode")) {
            String newCode = body.get("accessCode");
            if (kb.getAccessCode() != null && !kb.getAccessCode().equals(newCode)) {
                kb.setPreviousAccessCode(kb.getAccessCode());
            }
            kb.setAccessCode(newCode);
        }
        return ResponseEntity.ok(toDto(repo.save(kb)));
    }

    @PostMapping("/{id}/regenerate")
    public ResponseEntity<Map<String, Object>> regenerate(@PathVariable Long id) {
        KeyBox kb = requireOwned(id);
        if (kb.getAccessCode() != null) kb.setPreviousAccessCode(kb.getAccessCode());
        kb.setAccessCode(String.format("%04d", random.nextInt(10000)));
        return ResponseEntity.ok(toDto(repo.save(kb)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        KeyBox kb = requireOwned(id);
        propConfigRepo.findByKeyBoxId(id).forEach(cfg -> {
            cfg.setKeyBox(null);
            propConfigRepo.save(cfg);
        });
        repo.delete(kb);
        return ResponseEntity.noContent().build();
    }

    private KeyBox requireOwned(Long id) {
        return repo.findByIdAndUserId(id, securityUtils.getCurrentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private Map<String, Object> toDto(KeyBox kb) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", kb.getId());
        m.put("name", kb.getName());
        m.put("accessCode", kb.getAccessCode());
        m.put("previousAccessCode", kb.getPreviousAccessCode());
        return m;
    }
}
