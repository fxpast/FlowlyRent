package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AvailabilityBlock;
import com.flowlyrent.model.Property;
import com.flowlyrent.model.enums.BlockType;
import com.flowlyrent.repository.AvailabilityBlockRepository;
import com.flowlyrent.repository.BookingRepository;
import com.flowlyrent.repository.PropertyRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/availability")
@RequiredArgsConstructor
@Tag(name = "Calendrier des disponibilités")
public class AdminAvailabilityController {

    private final BookingRepository bookingRepository;
    private final AvailabilityBlockRepository blockRepository;
    private final PropertyRepository propertyRepository;
    private final SecurityUtils securityUtils;

    @GetMapping("/calendar")
    public Map<String, Object> getCalendar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        Long userId = securityUtils.getCurrentUserId();

        List<Map<String, Object>> properties = propertyRepository.findByAppUser(securityUtils.getCurrentUser())
                .stream().map(p -> Map.<String, Object>of(
                        "id", p.getId(),
                        "name", p.getName(),
                        "city", p.getCity() != null ? p.getCity() : ""
                )).collect(Collectors.toList());

        List<Map<String, Object>> bookings = bookingRepository.findByUserIdAndDateRange(userId, from, to)
                .stream().map(b -> Map.<String, Object>of(
                        "id", b.getId(),
                        "propertyId", b.getProperty().getId(),
                        "arrival", b.getArrival().toString(),
                        "departure", b.getDeparture().toString(),
                        "guestName", trim(b.getFirstName()) + " " + trim(b.getLastName()),
                        "status", b.getStatus() != null ? b.getStatus() : "new",
                        "channel", b.getChannel() != null ? b.getChannel() : ""
                )).collect(Collectors.toList());

        List<Map<String, Object>> blocks = blockRepository.findByUserIdAndDateRange(userId, from, to)
                .stream().map(bl -> Map.<String, Object>of(
                        "id", bl.getId(),
                        "propertyId", bl.getProperty().getId(),
                        "startDate", bl.getStartDate().toString(),
                        "endDate", bl.getEndDate().toString(),
                        "type", bl.getType().name(),
                        "notes", bl.getNotes() != null ? bl.getNotes() : ""
                )).collect(Collectors.toList());

        return Map.of("properties", properties, "bookings", bookings, "blocks", blocks);
    }

    @PostMapping("/blocks")
    public ResponseEntity<Map<String, Object>> createBlock(@RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        Long propertyId = Long.parseLong(body.get("propertyId").toString());

        Property property = propertyRepository.findById(propertyId)
                .filter(p -> p.getAppUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Logement introuvable"));

        LocalDate start = LocalDate.parse(body.get("startDate").toString());
        LocalDate end   = LocalDate.parse(body.get("endDate").toString());
        if (!end.isAfter(start.minusDays(1))) {
            return ResponseEntity.badRequest().body(Map.of("error", "La date de fin doit être >= à la date de début"));
        }

        AvailabilityBlock block = new AvailabilityBlock();
        block.setProperty(property);
        block.setStartDate(start);
        block.setEndDate(end);
        block.setCreatedBy(securityUtils.getCurrentUser());
        if (body.containsKey("type")) {
            try { block.setType(BlockType.valueOf(body.get("type").toString())); }
            catch (IllegalArgumentException ignored) {}
        }
        if (body.containsKey("notes")) block.setNotes(body.get("notes").toString());

        AvailabilityBlock saved = blockRepository.save(block);
        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "propertyId", propertyId,
                "startDate", saved.getStartDate().toString(),
                "endDate", saved.getEndDate().toString(),
                "type", saved.getType().name(),
                "notes", saved.getNotes() != null ? saved.getNotes() : ""
        ));
    }

    @DeleteMapping("/blocks/{id}")
    public ResponseEntity<Void> deleteBlock(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        blockRepository.findById(id)
                .filter(b -> b.getProperty().getAppUser().getId().equals(userId))
                .ifPresent(blockRepository::delete);
        return ResponseEntity.noContent().build();
    }

    private String trim(String s) { return s != null ? s.trim() : ""; }
}
