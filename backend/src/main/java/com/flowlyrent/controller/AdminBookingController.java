package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.service.Beds24ApiClient;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/bookings")
@RequiredArgsConstructor
@Tag(name = "Réservations admin")
public class AdminBookingController {

    private final Beds24ApiClient beds24;
    private final Beds24AccountRepository accountRepo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<?> getBookings(@RequestParam Map<String, String> params) {
        try {
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.getBookings(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/arrivals")
    public ResponseEntity<?> getArrivals(@RequestParam(defaultValue = "") String weekStart) {
        try {
            LocalDate start = weekStart.isBlank() ? LocalDate.now() : LocalDate.parse(weekStart);
            Map<String, String> params = Map.of(
                    "arrivalFrom", start.toString(),
                    "arrivalTo", start.plusDays(6).toString()
            );
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.getBookings(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/departures")
    public ResponseEntity<?> getDepartures(@RequestParam(defaultValue = "") String weekStart) {
        try {
            LocalDate start = weekStart.isBlank() ? LocalDate.now() : LocalDate.parse(weekStart);
            Map<String, String> params = Map.of(
                    "departureFrom", start.toString(),
                    "departureTo", start.plusDays(6).toString()
            );
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.getBookings(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PostMapping
    public ResponseEntity<?> saveBookings(@RequestBody List<Map<String, Object>> payload) {
        try {
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.saveBookings(beds24.tokenFor(account), payload));
        } catch (Exception e) {
            return error(e);
        }
    }

    @DeleteMapping
    public ResponseEntity<?> deleteBookings(@RequestParam List<Long> ids) {
        try {
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.deleteBookings(beds24.tokenFor(account), ids));
        } catch (Exception e) {
            return error(e);
        }
    }

    private Beds24Account requireAccount() {
        return accountRepo.findByAppUserId(securityUtils.getCurrentUserId())
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté. Allez dans Paramètres pour le connecter."));
    }

    private ResponseEntity<Map<String, String>> error(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
