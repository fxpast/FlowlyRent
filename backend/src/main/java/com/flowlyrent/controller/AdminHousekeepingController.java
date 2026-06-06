package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.HousekeeperProfile;
import com.flowlyrent.model.HousekeepingStaff;
import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.TaskPhoto;
import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.model.enums.TaskType;
import com.flowlyrent.repository.HousekeeperProfileRepository;
import com.flowlyrent.repository.HousekeepingStaffRepository;
import com.flowlyrent.repository.HousekeepingTaskRepository;
import com.flowlyrent.repository.TaskPhotoRepository;
import com.flowlyrent.service.CloudinaryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/housekeeping")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Tâches ménage")
public class AdminHousekeepingController {

    private final HousekeepingTaskRepository taskRepo;
    private final HousekeepingStaffRepository staffRepo;
    private final HousekeeperProfileRepository housekeeperRepo;
    private final TaskPhotoRepository photoRepo;
    private final CloudinaryService cloudinaryService;
    private final SecurityUtils securityUtils;

    // --- Tâches ---

    @GetMapping("/by-booking/{bookingId}")
    public ResponseEntity<List<HousekeepingTask>> getByBooking(
            @PathVariable String bookingId,
            @RequestParam(required = false) String propertyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate scheduledDate) {
        Long userId = securityUtils.getCurrentUserId();

        // 1. Cherche toutes les tâches par beds24BookingId (scopées à l'utilisateur)
        List<HousekeepingTask> byId = taskRepo.findByBeds24BookingIdOrderByScheduledDateAsc(bookingId)
                .stream().filter(t -> t.getUser().getId().equals(userId)).toList();
        if (!byId.isEmpty()) return ResponseEntity.ok(byId);

        // 2. Fallback : tâche manuelle sans bookingId — cherche par propriété + date
        if (propertyId != null && scheduledDate != null) {
            return ResponseEntity.ok(
                taskRepo.findByUserIdAndBeds24PropertyIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                    userId, propertyId, scheduledDate.atStartOfDay(), scheduledDate.atTime(LocalTime.MAX)));
        }

        return ResponseEntity.ok(List.of());
    }

    @GetMapping
    public List<HousekeepingTask> getTasks(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String propertyId) {
        Long userId = securityUtils.getCurrentUserId();
        LocalDateTime start = (from != null ? from : LocalDate.now().minusDays(7)).atStartOfDay();
        LocalDateTime end   = (to   != null ? to   : LocalDate.now().plusDays(30)).atTime(LocalTime.MAX);
        if (propertyId != null && !propertyId.isBlank()) {
            return taskRepo.findByUserIdAndBeds24PropertyIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                    userId, propertyId, start, end);
        }
        return taskRepo.findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(userId, start, end);
    }

    @PostMapping
    public ResponseEntity<HousekeepingTask> createTask(@RequestBody Map<String, Object> body) {
        AppUser user = securityUtils.getCurrentUser();

        HousekeepingTask task = new HousekeepingTask();
        task.setUser(user);
        task.setBeds24PropertyId(body.get("beds24PropertyId").toString());
        task.setPropertyName(body.containsKey("propertyName") ? body.get("propertyName").toString() : null);
        task.setScheduledDate(parseScheduledDate(body.get("scheduledDate").toString()));

        if (body.containsKey("type"))         task.setType(TaskType.valueOf(body.get("type").toString()));
        if (body.containsKey("notes"))        task.setNotes(body.get("notes").toString());
        if (body.containsKey("hourlyRate"))   task.setHourlyRate(new BigDecimal(body.get("hourlyRate").toString()));
        if (body.containsKey("extraHours"))   task.setExtraHours(Float.parseFloat(body.get("extraHours").toString()));
        if (body.containsKey("beds24BookingId")) task.setBeds24BookingId(body.get("beds24BookingId").toString());

        if (body.containsKey("staffId")) {
            Long staffId = Long.parseLong(body.get("staffId").toString());
            staffRepo.findById(staffId)
                    .filter(s -> s.getUser().getId().equals(user.getId()))
                    .ifPresent(task::setStaff);
        }

        if (body.containsKey("housekeeperId")) {
            Long hkId = Long.parseLong(body.get("housekeeperId").toString());
            housekeeperRepo.findByIdAndUserId(hkId, user.getId())
                    .ifPresent(task::setHousekeeper);
        }

        return ResponseEntity.ok(taskRepo.save(task));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<HousekeepingTask> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Long userId = securityUtils.getCurrentUserId();
        HousekeepingTask task = taskRepo.findById(id)
                .filter(t -> t.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));

        TaskStatus status = TaskStatus.valueOf(body.get("status"));
        task.setStatus(status);
        if (status == TaskStatus.DONE) task.setCompletedAt(LocalDateTime.now());
        return ResponseEntity.ok(taskRepo.save(task));
    }

    @GetMapping("/{id}/photos")
    public ResponseEntity<List<TaskPhoto>> getPhotos(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        taskRepo.findById(id)
                .filter(t -> t.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));
        return ResponseEntity.ok(photoRepo.findByTaskIdOrderByUploadedAtAsc(id));
    }

    @PostMapping("/{id}/photos")
    public ResponseEntity<TaskPhoto> addPhoto(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Long userId = securityUtils.getCurrentUserId();
        HousekeepingTask task = taskRepo.findById(id)
                .filter(t -> t.getUser().getId().equals(userId))
                .orElse(null);
        if (task == null) return ResponseEntity.notFound().build();

        TaskPhoto photo = new TaskPhoto();
        photo.setTask(task);
        photo.setPhotoType(body.getOrDefault("photoType", "AFTER"));
        photo.setCaption(body.get("caption"));
        photo.setData("");

        String base64Data = body.get("data");
        if (base64Data != null && !base64Data.isBlank()) {
            try {
                java.util.Map<?, ?> result = cloudinaryService.uploadBase64(
                    base64Data, "flowlyrent/tasks/" + task.getId()
                );
                photo.setUrl(result.get("secure_url").toString());
                photo.setPublicId(result.get("public_id").toString());
                photo.setData(null);
            } catch (Exception e) {
                log.warn("Cloudinary upload failed, falling back to base64: {}", e.getMessage());
                photo.setData(base64Data);
            }
        }
        return ResponseEntity.ok(photoRepo.save(photo));
    }

    @DeleteMapping("/{id}/photos/{photoId}")
    public ResponseEntity<Void> deletePhoto(@PathVariable Long id, @PathVariable Long photoId) {
        Long userId = securityUtils.getCurrentUserId();
        taskRepo.findById(id)
                .filter(t -> t.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));
        photoRepo.findById(photoId).ifPresent(photo -> {
            if (photo.getPublicId() != null) cloudinaryService.delete(photo.getPublicId());
        });
        photoRepo.deleteById(photoId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        HousekeepingTask task = taskRepo.findById(id)
                .filter(t -> t.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));
        taskRepo.delete(task);
        return ResponseEntity.noContent().build();
    }

    // --- Personnel ---

    @GetMapping("/staff")
    public List<HousekeepingStaff> getStaff() {
        return staffRepo.findByUserIdAndActiveTrue(securityUtils.getCurrentUserId());
    }

    @PostMapping("/staff")
    public ResponseEntity<HousekeepingStaff> createStaff(@RequestBody Map<String, Object> body) {
        HousekeepingStaff staff = new HousekeepingStaff();
        staff.setUser(securityUtils.getCurrentUser());
        staff.setFirstName(body.get("firstName").toString());
        staff.setLastName(body.get("lastName").toString());
        if (body.containsKey("phone"))      staff.setPhone(body.get("phone").toString());
        if (body.containsKey("status"))     staff.setStatus(body.get("status").toString());
        if (body.containsKey("hourlyRate")) staff.setHourlyRate(new BigDecimal(body.get("hourlyRate").toString()));
        if (body.containsKey("hireDate"))   staff.setHireDate(LocalDate.parse(body.get("hireDate").toString()));
        return ResponseEntity.ok(staffRepo.save(staff));
    }

    @PutMapping("/staff/{id}")
    public ResponseEntity<HousekeepingStaff> updateStaff(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        HousekeepingStaff staff = staffRepo.findById(id)
                .filter(s -> s.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Personnel introuvable"));
        if (body.containsKey("firstName"))  staff.setFirstName(body.get("firstName").toString());
        if (body.containsKey("lastName"))   staff.setLastName(body.get("lastName").toString());
        if (body.containsKey("phone"))      staff.setPhone(body.get("phone").toString());
        if (body.containsKey("status"))     staff.setStatus(body.get("status").toString());
        if (body.containsKey("hourlyRate")) staff.setHourlyRate(new BigDecimal(body.get("hourlyRate").toString()));
        if (body.containsKey("active"))     staff.setActive(Boolean.parseBoolean(body.get("active").toString()));
        return ResponseEntity.ok(staffRepo.save(staff));
    }

    private static final DateTimeFormatter FMT_HHMM = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    private LocalDateTime parseScheduledDate(String raw) {
        if (!raw.contains("T")) return LocalDate.parse(raw).atTime(9, 0);
        try {
            return LocalDateTime.parse(raw);                   // HH:mm:ss ou ISO complet
        } catch (Exception e) {
            return LocalDateTime.parse(raw, FMT_HHMM);        // HH:mm sans secondes (datetime-local)
        }
    }
}
