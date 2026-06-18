package com.flowlyrent.controller;

import com.flowlyrent.dto.SuperAdminStatsDTO;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.Feedback;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.FeedbackRepository;
import com.flowlyrent.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
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
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/stats")
    public ResponseEntity<SuperAdminStatsDTO> getStats() {
        return ResponseEntity.ok(analyticsService.buildStats());
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getUsers() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
            .map(u -> Map.<String, Object>of(
                "id", u.getId(),
                "email", u.getEmail() != null ? u.getEmail() : "",
                "firstName", u.getFirstName() != null ? u.getFirstName() : "",
                "lastName", u.getLastName() != null ? u.getLastName() : "",
                "plan", u.getPlan() != null ? u.getPlan().name() : "FREE",
                "role", u.getRole() != null ? u.getRole().name() : "USER",
                "active", u.isActive(),
                "createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : ""
            ))
            .toList();
        return ResponseEntity.ok(users);
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            // Enfants des tâches ménage (avant housekeeping_tasks)
            jdbcTemplate.update("DELETE FROM task_photos WHERE task_id IN (SELECT id FROM housekeeping_tasks WHERE user_id = ?)", id);
            jdbcTemplate.update("DELETE FROM task_linen_usages WHERE task_id IN (SELECT id FROM housekeeping_tasks WHERE user_id = ?)", id);
            // Tâches ménage avant housekeeper_profiles (housekeeping_tasks.housekeeper_id → housekeeper_profiles)
            jdbcTemplate.update("DELETE FROM housekeeping_tasks WHERE user_id = ?", id);
            // Enfants linge (avant linen_items et linen_templates)
            jdbcTemplate.update("DELETE FROM linen_movements WHERE linen_item_id IN (SELECT id FROM linen_items WHERE user_id = ?)", id);
            jdbcTemplate.update("DELETE FROM linen_movements WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM linen_template_items WHERE template_id IN (SELECT id FROM linen_templates WHERE user_id = ?)", id);
            // Enfants factures et règles (avant invoices et expense_rules)
            jdbcTemplate.update("DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE user_id = ?)", id);
            jdbcTemplate.update("DELETE FROM expense_rule_keywords WHERE rule_id IN (SELECT id FROM expense_rules WHERE user_id = ?)", id);
            jdbcTemplate.update("DELETE FROM expense_rule_alt_keywords WHERE rule_id IN (SELECT id FROM expense_rules WHERE user_id = ?)", id);
            // Enfants bundles (avant property_bundles)
            jdbcTemplate.update("DELETE FROM property_bundle_members WHERE bundle_id IN (SELECT id FROM property_bundles WHERE user_id = ?)", id);
            // Références directes à users
            jdbcTemplate.update("DELETE FROM admin_notification_reads WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM admin_notification_targets WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM analytics_events WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM beds24_accounts WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM booking_time_overrides WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM expense_rules WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM faq_suggestions WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM fcm_tokens WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM feedbacks WHERE user_id = ?", id);
            // Nullifier housekeeper_id dans les tâches avant de supprimer les profils liés
            jdbcTemplate.update("UPDATE housekeeping_tasks SET housekeeper_id = NULL WHERE housekeeper_id IN (SELECT id FROM housekeeper_profiles WHERE linked_user_id = ?)", id);
            jdbcTemplate.update("DELETE FROM housekeeper_profiles WHERE user_id = ? OR linked_user_id = ?", id, id);
            jdbcTemplate.update("DELETE FROM housekeeping_staff WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM ical_bookings WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM invoices WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM key_boxes WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM linen_items WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM linen_templates WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM property_ical_sources WHERE local_property_id IN (SELECT id FROM local_properties WHERE user_id = ?)", id);
            jdbcTemplate.update("DELETE FROM local_properties WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM manual_expenses WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM message_templates WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM min_stay_strategies WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM property_bundles WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM property_configs WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM property_inventory_items WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM push_subscriptions WHERE user_id = ?", id);
            jdbcTemplate.update("DELETE FROM qonto_accounts WHERE user_id = ?", id);
            userRepository.delete(user);
            return ResponseEntity.ok(Map.of("status", "Compte supprimé"));
        }).orElse(ResponseEntity.notFound().build());
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
