package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.service.Beds24ApiClient;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/availability")
@RequiredArgsConstructor
@Tag(name = "Disponibilités")
public class AdminAvailabilityController {

    private final Beds24ApiClient beds24;
    private final Beds24AccountRepository accountRepo;
    private final SecurityUtils securityUtils;

    @GetMapping("/calendar")
    public ResponseEntity<?> getCalendar(@RequestParam Map<String, String> params) {
        try {
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.getCalendar(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PostMapping("/calendar")
    public ResponseEntity<?> updateCalendar(@RequestBody List<Map<String, Object>> payload) {
        try {
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.updateCalendar(beds24.tokenFor(account), payload));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/availability")
    public ResponseEntity<?> getAvailability(@RequestParam Map<String, String> params) {
        try {
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.getAvailability(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    private Beds24Account requireAccount() {
        return accountRepo.findByAppUserId(securityUtils.getCurrentUserId())
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté."));
    }

    private ResponseEntity<Map<String, String>> error(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
