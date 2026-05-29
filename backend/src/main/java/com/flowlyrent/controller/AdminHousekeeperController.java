package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.HousekeeperProfile;
import com.flowlyrent.model.enums.SubscriptionPlan;
import com.flowlyrent.model.enums.UserRole;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.HousekeeperProfileRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/housekeepers")
@RequiredArgsConstructor
@Tag(name = "Prestataires ménage")
public class AdminHousekeeperController {

    private final HousekeeperProfileRepository repo;
    private final AppUserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
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

    @PostMapping("/{id}/activate")
    public ResponseEntity<?> activatePortal(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Long ownerId = securityUtils.getCurrentUserId();
        HousekeeperProfile profile = repo.findByIdAndUserId(id, ownerId)
                .orElse(null);
        if (profile == null) return ResponseEntity.notFound().build();

        String email    = body.get("email");
        String password = body.get("password");
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body("email et password requis");
        }
        if (userRepo.existsByEmail(email)) {
            return ResponseEntity.badRequest().body("Cet email est déjà utilisé");
        }

        AppUser linked = new AppUser();
        linked.setEmail(email);
        linked.setPassword(passwordEncoder.encode(password));
        linked.setFirstName(profile.getName());
        linked.setRole(UserRole.HOUSEKEEPER);
        linked.setPlan(SubscriptionPlan.FREE);
        userRepo.save(linked);

        profile.setLinkedUser(linked);
        return ResponseEntity.ok(repo.save(profile));
    }

    @DeleteMapping("/{id}/deactivate")
    public ResponseEntity<HousekeeperProfile> deactivatePortal(@PathVariable Long id) {
        Long ownerId = securityUtils.getCurrentUserId();
        return repo.findByIdAndUserId(id, ownerId)
            .map(h -> {
                if (h.getLinkedUser() != null) {
                    AppUser u = h.getLinkedUser();
                    u.setActive(false);
                    userRepo.save(u);
                    h.setLinkedUser(null);
                }
                return ResponseEntity.ok(repo.save(h));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    private void applyBody(HousekeeperProfile h, Map<String, String> body) {
        if (body.containsKey("name"))  h.setName(body.get("name"));
        if (body.containsKey("phone")) h.setPhone(body.get("phone"));
        if (body.containsKey("email")) h.setEmail(body.get("email"));
        if (body.containsKey("notes")) h.setNotes(body.get("notes"));
    }
}
