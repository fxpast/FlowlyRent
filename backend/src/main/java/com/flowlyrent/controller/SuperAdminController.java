package com.flowlyrent.controller;

import com.flowlyrent.dto.SuperAdminStatsDTO;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.Feedback;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.FeedbackRepository;
import com.flowlyrent.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/superadmin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SuperAdminController {

    private final AnalyticsService analyticsService;
    private final AppUserRepository userRepository;
    private final FeedbackRepository feedbackRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/stats")
    public ResponseEntity<SuperAdminStatsDTO> getStats() {
        return ResponseEntity.ok(analyticsService.buildStats());
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getUsers() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
            .map(u -> Map.<String, Object>of(
                "id", u.getId(),
                "email", u.getEmail(),
                "firstName", u.getFirstName() != null ? u.getFirstName() : "",
                "lastName", u.getLastName() != null ? u.getLastName() : "",
                "plan", u.getPlan().name(),
                "role", u.getRole().name(),
                "active", u.isActive(),
                "createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : ""
            ))
            .toList();
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/users/{id}/password")
    public ResponseEntity<Map<String, String>> resetUserPassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mot de passe invalide (8 caractères minimum)"));
        }
        return userRepository.findById(id).map(user -> {
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("status", "Mot de passe mis à jour"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/feedbacks")
    public ResponseEntity<List<Feedback>> getFeedbacks() {
        return ResponseEntity.ok(feedbackRepository.findAllByOrderByCreatedAtDesc());
    }

    @PatchMapping("/feedbacks/{id}/status")
    public ResponseEntity<Feedback> updateFeedbackStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return feedbackRepository.findById(id).map(fb -> {
            fb.setStatus(body.getOrDefault("status", fb.getStatus()));
            return ResponseEntity.ok(feedbackRepository.save(fb));
        }).orElse(ResponseEntity.notFound().build());
    }
}
