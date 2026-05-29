package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.HousekeeperProfile;
import com.flowlyrent.repository.HousekeeperProfileRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/housekeepers")
@RequiredArgsConstructor
@Tag(name = "Prestataires ménage")
public class AdminHousekeeperController {

    private final HousekeeperProfileRepository repo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<HousekeeperProfile>> getAll() {
        return ResponseEntity.ok(
            repo.findByUserIdAndActiveTrueOrderByNameAsc(securityUtils.getCurrentUserId())
        );
    }

    @PostMapping
    public ResponseEntity<HousekeeperProfile> create(@RequestBody Map<String, String> body) {
        AppUser user = securityUtils.getCurrentUser();
        HousekeeperProfile h = new HousekeeperProfile();
        h.setUser(user);
        applyBody(h, body);
        return ResponseEntity.ok(repo.save(h));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HousekeeperProfile> update(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        return repo.findByIdAndUserId(id, securityUtils.getCurrentUserId())
            .map(h -> { applyBody(h, body); return ResponseEntity.ok(repo.save(h)); })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return repo.findByIdAndUserId(id, securityUtils.getCurrentUserId())
            .map(h -> { h.setActive(false); repo.save(h); return ResponseEntity.ok().<Void>build(); })
            .orElse(ResponseEntity.notFound().build());
    }

    private void applyBody(HousekeeperProfile h, Map<String, String> body) {
        if (body.containsKey("name"))  h.setName(body.get("name"));
        if (body.containsKey("phone")) h.setPhone(body.get("phone"));
        if (body.containsKey("email")) h.setEmail(body.get("email"));
        if (body.containsKey("notes")) h.setNotes(body.get("notes"));
    }
}
