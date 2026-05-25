package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.Property;
import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.model.enums.TaskType;
import com.flowlyrent.repository.HousekeepingTaskRepository;
import com.flowlyrent.repository.PropertyRepository;
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
@RequestMapping("/admin/housekeeping")
@RequiredArgsConstructor
@Tag(name = "Tâches ménage")
public class AdminHousekeepingController {

    private final HousekeepingTaskRepository taskRepository;
    private final PropertyRepository propertyRepository;
    private final SecurityUtils securityUtils;

    @GetMapping
    public List<HousekeepingTask> getTasks(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Long userId = securityUtils.getCurrentUserId();
        LocalDate start = from != null ? from : LocalDate.now().minusDays(7);
        LocalDate end   = to   != null ? to   : LocalDate.now().plusDays(30);
        return taskRepository.findByProperty_AppUser_IdAndScheduledDateBetweenOrderByScheduledDateAsc(userId, start, end);
    }

    @PostMapping
    public ResponseEntity<HousekeepingTask> createTask(@RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        Long propertyId = Long.parseLong(body.get("propertyId").toString());

        Property property = propertyRepository.findById(propertyId)
                .filter(p -> p.getAppUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Logement introuvable"));

        HousekeepingTask task = new HousekeepingTask();
        task.setProperty(property);
        task.setScheduledDate(LocalDate.parse(body.get("scheduledDate").toString()));
        if (body.containsKey("type")) task.setType(TaskType.valueOf(body.get("type").toString()));
        if (body.containsKey("assignedTo")) task.setAssignedTo(body.get("assignedTo").toString());
        if (body.containsKey("notes")) task.setNotes(body.get("notes").toString());

        return ResponseEntity.ok(taskRepository.save(task));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<HousekeepingTask> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Long userId = securityUtils.getCurrentUserId();
        HousekeepingTask task = taskRepository.findById(id)
                .filter(t -> t.getProperty().getAppUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));

        TaskStatus status = TaskStatus.valueOf(body.get("status"));
        task.setStatus(status);
        if (status == TaskStatus.DONE) task.setCompletedAt(LocalDateTime.now());
        return ResponseEntity.ok(taskRepository.save(task));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        HousekeepingTask task = taskRepository.findById(id)
                .filter(t -> t.getProperty().getAppUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));
        taskRepository.delete(task);
        return ResponseEntity.noContent().build();
    }
}
