package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.HousekeeperProfile;
import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.TaskPhoto;
import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.model.enums.TaskType;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.HousekeeperProfileRepository;
import com.flowlyrent.repository.HousekeepingTaskRepository;
import com.flowlyrent.repository.TaskPhotoRepository;
import com.flowlyrent.service.Beds24ApiClient;
import com.flowlyrent.service.CloudinaryService;
import com.flowlyrent.service.LinenService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/housekeeper")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Portail prestataire")
public class HousekeeperPortalController {

    private static final Set<String> PRICE_KEYS = Set.of(
        "price", "totalPrice", "total", "deposit", "balance", "paid",
        "commission", "bookingFee", "cleaningFee", "taxAmount", "tax",
        "invoice", "refund", "creditCard", "currency"
    );

    private final HousekeeperProfileRepository profileRepo;
    private final HousekeepingTaskRepository taskRepo;
    private final TaskPhotoRepository photoRepo;
    private final CloudinaryService cloudinaryService;
    private final LinenService linenService;
    private final SecurityUtils securityUtils;
    private final Beds24ApiClient beds24;
    private final Beds24AccountRepository accountRepo;

    private HousekeeperProfile myProfile() {
        Long userId = securityUtils.getCurrentUserId();
        return profileRepo.findByLinkedUserIdWithUser(userId)
                .orElseThrow(() -> new IllegalStateException("Profil prestataire introuvable"));
    }

    @GetMapping("/me")
    public ResponseEntity<HousekeeperProfile> me() {
        return ResponseEntity.ok(myProfile());
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<HousekeepingTask>> myTasks(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from) {
        HousekeeperProfile profile = myProfile();
        LocalDateTime start = (from != null ? from : LocalDate.now().minusDays(1)).atStartOfDay();
        return ResponseEntity.ok(
            taskRepo.findByHousekeeper_IdAndScheduledDateGreaterThanEqualOrderByScheduledDateAsc(
                    profile.getId(), start)
        );
    }

    @PatchMapping("/tasks/{id}/status")
    public ResponseEntity<HousekeepingTask> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        HousekeeperProfile profile = myProfile();
        HousekeepingTask task = taskRepo.findById(id)
                .filter(t -> t.getHousekeeper() != null && t.getHousekeeper().getId().equals(profile.getId()))
                .orElse(null);
        if (task == null) return ResponseEntity.notFound().build();

        TaskStatus status = TaskStatus.valueOf(body.get("status"));
        task.setStatus(status);
        if (status == TaskStatus.DONE) {
            task.setCompletedAt(LocalDateTime.now());
            linenService.deductLinenForTask(task, profile.getUser());
        }
        return ResponseEntity.ok(taskRepo.save(task));
    }

    @PostMapping("/tasks/{id}/report")
    public ResponseEntity<HousekeepingTask> saveReport(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        HousekeeperProfile profile = myProfile();
        HousekeepingTask task = taskRepo.findById(id)
                .filter(t -> t.getHousekeeper() != null && t.getHousekeeper().getId().equals(profile.getId()))
                .orElse(null);
        if (task == null) return ResponseEntity.notFound().build();

        boolean wasIncident = Boolean.TRUE.equals(task.getHasIncident());
        boolean newIncident = body.containsKey("hasIncident") &&
                              Boolean.parseBoolean(body.get("hasIncident").toString());
        log.debug("saveReport tâche {} | wasIncident={} | newIncident={} | host={}",
                id, wasIncident, newIncident, profile.getUser().getId());

        if (body.containsKey("reportComment"))
            task.setReportComment(body.get("reportComment").toString());
        task.setHasIncident(newIncident);
        if (body.containsKey("incidentDescription"))
            task.setIncidentDescription(body.get("incidentDescription").toString());
        task.setReportedAt(LocalDateTime.now());

        // Le rapport est sauvegardé dans sa propre transaction, indépendamment de la suite
        HousekeepingTask saved = taskRepo.save(task);

        // Création automatique d'une tâche MAINTENANCE si l'incident vient d'être déclaré
        if (!wasIncident && newIncident) {
            log.debug("Création tâche MAINTENANCE pour tâche {} (propId={})", saved.getId(), saved.getBeds24PropertyId());
            try {
                HousekeepingTask maintenance = new HousekeepingTask();
                maintenance.setUser(profile.getUser());
                maintenance.setBeds24PropertyId(saved.getBeds24PropertyId());
                maintenance.setPropertyName(saved.getPropertyName());
                maintenance.setType(TaskType.MAINTENANCE);
                maintenance.setScheduledDate(saved.getScheduledDate().toLocalDate().plusDays(1).atTime(10, 0));
                String desc = saved.getIncidentDescription();
                maintenance.setNotes("Dépannage suite incident du "
                    + saved.getScheduledDate().toLocalDate()
                    + (desc != null && !desc.isBlank() ? " : " + desc : ""));
                taskRepo.save(maintenance);
                log.info("Tâche MAINTENANCE créée automatiquement (incident tâche {})", saved.getId());
            } catch (Exception e) {
                log.error("Échec création tâche MAINTENANCE pour tâche {} : {}", saved.getId(), e.getMessage(), e);
            }
        }

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/tasks/{id}/photos")
    public ResponseEntity<List<TaskPhoto>> getPhotos(@PathVariable Long id) {
        HousekeeperProfile profile = myProfile();
        taskRepo.findById(id)
                .filter(t -> t.getHousekeeper() != null && t.getHousekeeper().getId().equals(profile.getId()))
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));
        return ResponseEntity.ok(photoRepo.findByTaskIdOrderByUploadedAtAsc(id));
    }

    @PostMapping("/tasks/{id}/photos")
    public ResponseEntity<TaskPhoto> addPhoto(@PathVariable Long id, @RequestBody Map<String, String> body) {
        HousekeeperProfile profile = myProfile();
        HousekeepingTask task = taskRepo.findById(id)
                .filter(t -> t.getHousekeeper() != null && t.getHousekeeper().getId().equals(profile.getId()))
                .orElse(null);
        if (task == null) return ResponseEntity.notFound().build();

        TaskPhoto photo = new TaskPhoto();
        photo.setTask(task);
        photo.setPhotoType(body.getOrDefault("photoType", "AFTER"));
        photo.setCaption(body.get("caption"));

        String base64Data = body.get("data");
        photo.setData(""); // évite la contrainte NOT NULL legacy pendant la migration
        if (base64Data != null && !base64Data.isBlank()) {
            try {
                java.util.Map<?, ?> result = cloudinaryService.uploadBase64(
                    base64Data, "flowlyrent/tasks/" + task.getId()
                );
                photo.setUrl(result.get("secure_url").toString());
                photo.setPublicId(result.get("public_id").toString());
                photo.setData(null); // Cloudinary OK → pas besoin de base64
            } catch (Exception e) {
                log.warn("Cloudinary upload failed, falling back to base64: {}", e.getMessage());
                photo.setData(base64Data);
            }
        }

        return ResponseEntity.ok(photoRepo.save(photo));
    }

    @DeleteMapping("/tasks/{id}/photos/{photoId}")
    public ResponseEntity<Void> deletePhoto(@PathVariable Long id, @PathVariable Long photoId) {
        HousekeeperProfile profile = myProfile();
        taskRepo.findById(id)
                .filter(t -> t.getHousekeeper() != null && t.getHousekeeper().getId().equals(profile.getId()))
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));
        photoRepo.findById(photoId).ifPresent(photo -> {
            if (photo.getPublicId() != null) cloudinaryService.delete(photo.getPublicId());
        });
        photoRepo.deleteById(photoId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/arrivals")
    public ResponseEntity<?> arrivals() {
        try {
            HousekeeperProfile profile = myProfile();
            Beds24Account account = accountRepo.findByAppUserId(profile.getUser().getId())
                    .orElse(null);
            if (account == null) return ResponseEntity.ok(List.of());
            String token = beds24.tokenFor(account);
            LocalDate today = LocalDate.now();
            Map<String, String> params = Map.of(
                    "arrivalFrom", today.toString(),
                    "arrivalTo",   today.plusDays(6).toString()
            );
            List<Map<String, Object>> bookings = beds24.getBookings(token, params);
            return ResponseEntity.ok(bookings.stream().map(this::stripPrices).toList());
        } catch (Exception e) {
            log.error("arrivals error: {}", e.getMessage(), e);
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/departures")
    public ResponseEntity<?> departures() {
        try {
            HousekeeperProfile profile = myProfile();
            Beds24Account account = accountRepo.findByAppUserId(profile.getUser().getId())
                    .orElse(null);
            if (account == null) return ResponseEntity.ok(List.of());
            String token = beds24.tokenFor(account);
            LocalDate today = LocalDate.now();
            Map<String, String> params = Map.of(
                    "departureFrom", today.toString(),
                    "departureTo",   today.plusDays(6).toString()
            );
            List<Map<String, Object>> bookings = beds24.getBookings(token, params);
            return ResponseEntity.ok(bookings.stream().map(this::stripPrices).toList());
        } catch (Exception e) {
            log.error("departures error: {}", e.getMessage(), e);
            return ResponseEntity.ok(List.of());
        }
    }

    private Map<String, Object> stripPrices(Map<String, Object> booking) {
        Map<String, Object> safe = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : booking.entrySet()) {
            String key = entry.getKey();
            boolean isPrice = PRICE_KEYS.contains(key)
                    || key.toLowerCase().contains("price")
                    || key.toLowerCase().contains("amount")
                    || key.toLowerCase().contains("fee")
                    || key.toLowerCase().contains("deposit")
                    || key.toLowerCase().contains("balance")
                    || key.toLowerCase().contains("commission")
                    || key.toLowerCase().contains("tax")
                    || key.toLowerCase().contains("invoice")
                    || key.toLowerCase().contains("paid");
            if (!isPrice) safe.put(key, entry.getValue());
        }
        return safe;
    }
}
