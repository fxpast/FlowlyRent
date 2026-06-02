package com.flowlyrent.controller;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.model.enums.TaskType;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.HousekeepingTaskRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Reçoit les webhooks de Beds24 (Settings → Properties → Access → Booking Webhook).
 * URL à configurer dans Beds24 : https://votre-domaine.com/api/webhooks/beds24/{userId}
 * Crée automatiquement une tâche de ménage à chaque nouvelle réservation confirmée.
 */
@RestController
@RequestMapping("/webhooks/beds24")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhooks Beds24")
public class Beds24WebhookController {

    private final HousekeepingTaskRepository taskRepo;
    private final AppUserRepository userRepo;

    @PostMapping("/{userId}")
    public ResponseEntity<String> handleWebhook(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> payload) {

        log.debug("[Webhook Beds24] userId={} payload={}", userId, payload);

        try {
            AppUser user = userRepo.findById(userId).orElse(null);
            if (user == null) return ResponseEntity.ok("ignored");

            String status = getString(payload, "status");
            String bookingId = getString(payload, "id");
            String propertyId = getString(payload, "propertyId");
            String departureStr = getString(payload, "departure");

            if (!"confirmed".equalsIgnoreCase(status) || bookingId == null) {
                return ResponseEntity.ok("ignored");
            }

            if (taskRepo.existsByBeds24BookingId(bookingId)) {
                return ResponseEntity.ok("exists");
            }

            HousekeepingTask task = new HousekeepingTask();
            task.setUser(user);
            task.setBeds24BookingId(bookingId);
            task.setBeds24PropertyId(propertyId);
            task.setType(TaskType.CHECKOUT_CLEANING);
            task.setStatus(TaskStatus.PENDING);
            task.setScheduledDate(departureStr != null
                    ? LocalDate.parse(departureStr).atTime(9, 0)
                    : LocalDateTime.now().withHour(9).withMinute(0).withSecond(0));
            taskRepo.save(task);

            log.info("[Webhook Beds24] Tâche ménage créée — booking={} propriété={}", bookingId, propertyId);
        } catch (Exception e) {
            log.warn("[Webhook Beds24] Erreur traitement : {}", e.getMessage());
        }

        return ResponseEntity.ok("ok");
    }

    private String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : null;
    }
}
