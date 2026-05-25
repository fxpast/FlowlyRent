package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.dto.BookingRequest;
import com.flowlyrent.dto.BookingResponse;
import com.flowlyrent.model.enums.BookingStatus;
import com.flowlyrent.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/bookings")
@RequiredArgsConstructor
@Tag(name = "Admin - Réservations")
public class AdminBookingController {

    private final BookingService bookingService;
    private final SecurityUtils securityUtils;

    @GetMapping
    @Operation(summary = "Liste les réservations de l'utilisateur connecté")
    public List<BookingResponse> getAllBookings() {
        return bookingService.getAllBookingsByUser(securityUtils.getCurrentUserId());
    }

    @GetMapping("/{id}")
    public BookingResponse getBooking(@PathVariable Long id) {
        return bookingService.getById(id);
    }

    @PostMapping
    @Operation(summary = "Créer une réservation directe")
    public ResponseEntity<BookingResponse> createBooking(@Valid @RequestBody BookingRequest request) {
        return ResponseEntity.ok(bookingService.createBooking(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier une réservation")
    public ResponseEntity<BookingResponse> updateBooking(@PathVariable Long id,
                                                          @RequestBody BookingRequest request) {
        return ResponseEntity.ok(bookingService.updateBooking(id, request));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Changer le statut d'une réservation")
    public ResponseEntity<BookingResponse> updateStatus(@PathVariable Long id,
                                                         @RequestBody Map<String, String> body) {
        BookingStatus status = BookingStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(bookingService.updateStatus(id, status));
    }

    @GetMapping("/arrivals")
    @Operation(summary = "Arrivées de la semaine")
    public List<BookingResponse> getArrivals(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        Long userId = securityUtils.getCurrentUserId();
        return weekStart != null
                ? bookingService.getArrivalsForWeekByUser(weekStart, userId)
                : bookingService.getArrivalsThisWeekByUser(userId);
    }

    @GetMapping("/departures")
    @Operation(summary = "Départs de la semaine")
    public List<BookingResponse> getDepartures(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        Long userId = securityUtils.getCurrentUserId();
        return weekStart != null
                ? bookingService.getDeparturesForWeekByUser(weekStart, userId)
                : bookingService.getDeparturesThisWeekByUser(userId);
    }
}
