package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.HousekeeperProfile;
import com.flowlyrent.model.HousekeepingStaff;
import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.TaskLinenUsage;
import com.flowlyrent.model.TaskPhoto;
import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.model.enums.TaskType;
import com.flowlyrent.repository.HousekeeperProfileRepository;
import com.flowlyrent.repository.HousekeepingStaffRepository;
import com.flowlyrent.repository.HousekeepingTaskRepository;
import com.flowlyrent.repository.LinenItemRepository;
import com.flowlyrent.repository.TaskLinenUsageRepository;
import com.flowlyrent.repository.TaskPhotoRepository;
import com.flowlyrent.service.CloudinaryService;
import com.flowlyrent.service.LinenService;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    private final TaskLinenUsageRepository usageRepo;
    private final LinenItemRepository linenItemRepo;
    private final CloudinaryService cloudinaryService;
    private final LinenService linenService;
    private final SecurityUtils securityUtils;

    // --- Tâches ---

    @GetMapping("/by-booking/{bookingId}")
    public ResponseEntity<List<HousekeepingTask>> getByBooking(
            @PathVariable String bookingId,
            @RequestParam(required = false) String propertyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate scheduledDate) {
        Long userId = securityUtils.getCurrentUserId();

        List<HousekeepingTask> byId = taskRepo.findByBeds24BookingIdOrderByScheduledDateAsc(bookingId)
                .stream().filter(t -> t.getUser().getId().equals(userId)).toList();
        if (!byId.isEmpty()) return ResponseEntity.ok(byId);

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

        HousekeepingTask saved = taskRepo.save(task);

        if (body.containsKey("linenUsages")) {
            saveLinenUsages(saved, user, body.get("linenUsages"));
        }

        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<HousekeepingTask> updateTask(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        AppUser user = securityUtils.getCurrentUser();
        HousekeepingTask task = taskRepo.findById(id)
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));

        if (body.containsKey("type"))             task.setType(TaskType.valueOf(body.get("type").toString()));
        if (body.containsKey("scheduledDate"))    task.setScheduledDate(parseScheduledDate(body.get("scheduledDate").toString()));
        if (body.containsKey("beds24PropertyId")) task.setBeds24PropertyId(body.get("beds24PropertyId").toString());
        if (body.containsKey("propertyName"))     task.setPropertyName(body.get("propertyName") != null ? body.get("propertyName").toString() : null);
        if (body.containsKey("notes"))            task.setNotes(body.get("notes") != null ? body.get("notes").toString() : null);
        if (body.containsKey("extraHours"))       task.setExtraHours(body.get("extraHours") != null ? Float.parseFloat(body.get("extraHours").toString()) : null);
        if (body.containsKey("hourlyRate"))       task.setHourlyRate(body.get("hourlyRate") != null ? new BigDecimal(body.get("hourlyRate").toString()) : null);

        if (body.containsKey("housekeeperId")) {
            if (body.get("housekeeperId") == null) {
                task.setHousekeeper(null);
            } else {
                Long hkId = Long.parseLong(body.get("housekeeperId").toString());
                housekeeperRepo.findByIdAndUserId(hkId, user.getId()).ifPresent(task::setHousekeeper);
            }
        }

        HousekeepingTask updated = taskRepo.save(task);

        if (body.containsKey("linenUsages")) {
            saveLinenUsages(updated, user, body.get("linenUsages"));
        }

        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<HousekeepingTask> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        AppUser user = securityUtils.getCurrentUser();
        HousekeepingTask task = taskRepo.findById(id)
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));

        TaskStatus status = TaskStatus.valueOf(body.get("status"));
        task.setStatus(status);
        if (status == TaskStatus.DONE) {
            task.setCompletedAt(LocalDateTime.now());
            linenService.deductLinenForTask(task, user);
        }
        return ResponseEntity.ok(taskRepo.save(task));
    }

    @GetMapping("/{id}/linen")
    public ResponseEntity<List<Map<String, Object>>> getTaskLinen(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        taskRepo.findById(id)
                .filter(t -> t.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));
        return ResponseEntity.ok(
            usageRepo.findByTask_Id(id).stream().map(u -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", u.getId());
                m.put("quantity", u.getQuantity());
                Map<String, Object> li = new LinkedHashMap<>();
                li.put("id", u.getLinenItem().getId());
                li.put("label", u.getLinenItem().getLabel());
                li.put("category", u.getLinenItem().getCategory());
                m.put("linenItem", li);
                return m;
            }).collect(Collectors.toList())
        );
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
        usageRepo.deleteByTaskId(id);
        List<TaskPhoto> photos = photoRepo.findByTaskIdOrderByUploadedAtAsc(id);
        for (TaskPhoto photo : photos) {
            if (photo.getPublicId() != null) cloudinaryService.delete(photo.getPublicId());
        }
        photoRepo.deleteByTaskId(id);
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

    // --- Helpers ---

    @SuppressWarnings("unchecked")
    private void saveLinenUsages(HousekeepingTask task, AppUser user, Object rawList) {
        if (!(rawList instanceof List)) return;
        usageRepo.deleteByTaskId(task.getId());
        for (Object item : (List<?>) rawList) {
            if (!(item instanceof Map)) continue;
            Map<String, Object> u = (Map<String, Object>) item;
            if (!u.containsKey("linenItemId") || !u.containsKey("quantity")) continue;
            int qty = Integer.parseInt(u.get("quantity").toString());
            if (qty <= 0) continue;
            Long linenItemId = Long.parseLong(u.get("linenItemId").toString());
            linenItemRepo.findByIdAndUserId(linenItemId, user.getId()).ifPresent(linenItem -> {
                TaskLinenUsage usage = new TaskLinenUsage();
                usage.setTask(task);
                usage.setLinenItem(linenItem);
                usage.setQuantity(qty);
                usageRepo.save(usage);
            });
        }
    }

    private static final DateTimeFormatter FMT_HHMM = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    private LocalDateTime parseScheduledDate(String raw) {
        if (!raw.contains("T")) return LocalDate.parse(raw).atTime(9, 0);
        try {
            return LocalDateTime.parse(raw);
        } catch (Exception e) {
            return LocalDateTime.parse(raw, FMT_HHMM);
        }
    }
}
