package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.HousekeeperProfile;
import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.TaskPhoto;
import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.repository.HousekeeperProfileRepository;
import com.flowlyrent.repository.HousekeepingTaskRepository;
import com.flowlyrent.repository.TaskPhotoRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/housekeeper")
@RequiredArgsConstructor
@Tag(name = "Portail prestataire")
public class HousekeeperPortalController {

    private final HousekeeperProfileRepository profileRepo;
    private final HousekeepingTaskRepository taskRepo;
    private final TaskPhotoRepository photoRepo;
    private final SecurityUtils securityUtils;

    private HousekeeperProfile myProfile() {
        Long userId = securityUtils.getCurrentUserId();
        return profileRepo.findByLinkedUserId(userId)
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
        LocalDate start = from != null ? from : LocalDate.now().minusDays(1);
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
        if (status == TaskStatus.DONE) task.setCompletedAt(LocalDateTime.now());
        return ResponseEntity.ok(taskRepo.save(task));
    }

    @PostMapping("/tasks/{id}/report")
    public ResponseEntity<HousekeepingTask> saveReport(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        HousekeeperProfile profile = myProfile();
        HousekeepingTask task = taskRepo.findById(id)
                .filter(t -> t.getHousekeeper() != null && t.getHousekeeper().getId().equals(profile.getId()))
                .orElse(null);
        if (task == null) return ResponseEntity.notFound().build();

        if (body.containsKey("reportComment"))
            task.setReportComment(body.get("reportComment").toString());
        if (body.containsKey("hasIncident"))
            task.setHasIncident(Boolean.parseBoolean(body.get("hasIncident").toString()));
        if (body.containsKey("incidentDescription"))
            task.setIncidentDescription(body.get("incidentDescription").toString());
        task.setReportedAt(LocalDateTime.now());

        return ResponseEntity.ok(taskRepo.save(task));
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
        photo.setData(body.get("data"));
        photo.setCaption(body.get("caption"));
        return ResponseEntity.ok(photoRepo.save(photo));
    }

    @DeleteMapping("/tasks/{id}/photos/{photoId}")
    public ResponseEntity<Void> deletePhoto(@PathVariable Long id, @PathVariable Long photoId) {
        HousekeeperProfile profile = myProfile();
        taskRepo.findById(id)
                .filter(t -> t.getHousekeeper() != null && t.getHousekeeper().getId().equals(profile.getId()))
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));
        photoRepo.deleteById(photoId);
        return ResponseEntity.noContent().build();
    }
}
