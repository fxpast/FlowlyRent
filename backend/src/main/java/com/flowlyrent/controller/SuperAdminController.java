package com.flowlyrent.controller;

import com.flowlyrent.dto.SuperAdminStatsDTO;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
}
