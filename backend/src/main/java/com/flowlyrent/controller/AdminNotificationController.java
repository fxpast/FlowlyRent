package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AdminNotification;
import com.flowlyrent.model.AdminNotificationRead;
import com.flowlyrent.repository.AdminNotificationReadRepository;
import com.flowlyrent.repository.AdminNotificationRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications utilisateur")
public class AdminNotificationController {

    private final AdminNotificationRepository notifRepo;
    private final AdminNotificationReadRepository readRepo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public List<Map<String, Object>> list() {
        Long userId = securityUtils.getCurrentUserId();
        Set<Long> readIds = readRepo.findByUser_Id(userId).stream()
                .map(r -> r.getNotification().getId())
                .collect(Collectors.toSet());
        return visibleForUser(userId).stream()
                .map(n -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",      n.getId());
                    m.put("subject", n.getSubject());
                    m.put("content", n.getContent());
                    m.put("sentAt",  n.getSentAt());
                    m.put("isRead",  readIds.contains(n.getId()));
                    return m;
                }).collect(Collectors.toList());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        Long userId = securityUtils.getCurrentUserId();
        Set<Long> readIds = readRepo.findByUser_Id(userId).stream()
                .map(r -> r.getNotification().getId())
                .collect(Collectors.toSet());
        long count = visibleForUser(userId).stream()
                .filter(n -> !readIds.contains(n.getId()))
                .count();
        return Map.of("count", count);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        if (!readRepo.existsByNotification_IdAndUser_Id(id, userId)) {
            notifRepo.findById(id).ifPresent(n -> {
                AdminNotificationRead read = new AdminNotificationRead();
                read.setNotification(n);
                read.setUser(securityUtils.getCurrentUser());
                readRepo.save(read);
            });
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllRead() {
        Long userId = securityUtils.getCurrentUserId();
        Set<Long> alreadyRead = readRepo.findByUser_Id(userId).stream()
                .map(r -> r.getNotification().getId())
                .collect(Collectors.toSet());
        var user = securityUtils.getCurrentUser();
        visibleForUser(userId).stream()
                .filter(n -> !alreadyRead.contains(n.getId()))
                .forEach(n -> {
                    AdminNotificationRead read = new AdminNotificationRead();
                    read.setNotification(n);
                    read.setUser(user);
                    readRepo.save(read);
                });
        return ResponseEntity.noContent().build();
    }

    // Notifications visibles pour un user : ciblées vers tous (targetUsers vide) OU spécifiquement ce user
    private List<AdminNotification> visibleForUser(Long userId) {
        return notifRepo.findAllByOrderBySentAtDesc().stream()
                .filter(n -> n.getTargetUsers().isEmpty()
                        || n.getTargetUsers().stream().anyMatch(u -> u.getId().equals(userId)))
                .collect(Collectors.toList());
    }
}
