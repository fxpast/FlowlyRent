package com.flowlyrent.controller;

import com.flowlyrent.dto.BookingRequest;
import com.flowlyrent.dto.BookingResponse;
import com.flowlyrent.dto.MessageDTO;
import com.flowlyrent.model.Property;
import com.flowlyrent.model.enums.SenderType;
import com.flowlyrent.repository.BookingRepository;
import com.flowlyrent.repository.PropertyRepository;
import com.flowlyrent.service.BookingService;
import com.flowlyrent.service.MessageService;
import com.flowlyrent.service.PaymentService;
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
@RequestMapping("/public")
@RequiredArgsConstructor
@Tag(name = "Public - Site de réservation")
public class PublicBookingController {

    private final PropertyRepository propertyRepository;
    private final BookingService bookingService;
    private final BookingRepository bookingRepository;
    private final MessageService messageService;
    private final PaymentService paymentService;

    @GetMapping("/properties")
    public List<Property> getProperties() {
        return propertyRepository.findByActiveTrue();
    }

    @GetMapping("/properties/{id}")
    public ResponseEntity<Property> getProperty(@PathVariable Long id) {
        return propertyRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/properties/{id}/availability")
    public Map<String, Object> checkAvailability(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {

        List<?> conflicts = bookingRepository.findConflictingBookings(id, checkIn, checkOut);
        return Map.of("available", conflicts.isEmpty());
    }

    @PostMapping("/bookings")
    public ResponseEntity<BookingResponse> createBooking(@Valid @RequestBody BookingRequest request) {
        return ResponseEntity.ok(bookingService.createBooking(request));
    }

    @GetMapping("/bookings/{id}")
    public ResponseEntity<BookingResponse> getBooking(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.getById(id));
    }

    @PostMapping("/messages/{bookingId}")
    public ResponseEntity<MessageDTO> sendMessage(@PathVariable Long bookingId,
                                                   @Valid @RequestBody MessageDTO dto) {
        return ResponseEntity.ok(messageService.sendMessage(bookingId, dto.getContent(), SenderType.GUEST));
    }

    @PostMapping("/payments/{bookingId}/checkout")
    public ResponseEntity<Map<String, Object>> checkout(@PathVariable Long bookingId,
                                                         @RequestBody Map<String, String> body) throws Exception {
        return ResponseEntity.ok(paymentService.createCheckoutSession(
                bookingId,
                body.get("successUrl"),
                body.get("cancelUrl")));
    }
}
