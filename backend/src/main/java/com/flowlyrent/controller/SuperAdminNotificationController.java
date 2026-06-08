package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AdminNotification;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.repository.AdminNotificationReadRepository;
import com.flowlyrent.repository.AdminNotificationRepository;
import com.flowlyrent.repository.AppUserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/superadmin/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications superadmin")
public class SuperAdminNotificationController {

    private final AdminNotificationRepository notifRepo;
    private final AdminNotificationReadRepository readRepo;
    private final AppUserRepository userRepo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public List<Map<String, Object>> list() {
        return notifRepo.findAllByOrderBySentAtDesc().stream()
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> send(@RequestBody Map<String, Object> body) {
        String content = (String) body.get("content");
        if (content == null || content.isBlank()) return ResponseEntity.badRequest().build();

        AdminNotification n = new AdminNotification();
        n.setContent(content.trim());
        Object rawSubject = body.get("subject");
        if (rawSubject instanceof String s && !s.isBlank()) n.setSubject(s.trim());
        n.setSentByEmail(securityUtils.getCurrentUser().getEmail());

        Object rawIds = body.get("targetUserIds");
        if (rawIds instanceof List<?> ids && !ids.isEmpty()) {
            List<Long> userIds = ids.stream()
                    .map(id -> Long.parseLong(id.toString()))
                    .collect(Collectors.toList());
            n.setTargetUsers(new HashSet<>(userRepo.findAllById(userIds)));
        }

        AdminNotification saved = notifRepo.save(n);
        return ResponseEntity.ok(toMap(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (notifRepo.existsById(id)) {
            readRepo.deleteByNotification_Id(id);
            notifRepo.deleteById(id);
        }
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toMap(AdminNotification n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",           n.getId());
        m.put("subject",      n.getSubject());
        m.put("content",      n.getContent());
        m.put("sentAt",       n.getSentAt());
        m.put("sentByEmail",  n.getSentByEmail());
        m.put("readCount",    readRepo.countByNotification_Id(n.getId()));
        m.put("targetAll",    n.getTargetUsers().isEmpty());
        m.put("targetEmails", n.getTargetUsers().stream()
                .map(AppUser::getEmail).sorted().collect(Collectors.toList()));
        return m;
    }
}
