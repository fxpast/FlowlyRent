package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.BookingTimeOverride;
import com.flowlyrent.repository.BookingTimeOverrideRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin/booking-time-overrides")
@RequiredArgsConstructor
@Tag(name = "Horaires personnalisés")
public class AdminBookingTimeOverrideController {

    private final BookingTimeOverrideRepository repo;
    private final SecurityUtils securityUtils;

    @GetMapping("/{beds24BookingId}")
    public ResponseEntity<BookingTimeOverride> get(@PathVariable String beds24BookingId) {
        Long userId = securityUtils.getCurrentUserId();
        return repo.findByUserIdAndBeds24BookingId(userId, beds24BookingId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PutMapping("/{beds24BookingId}")
    public ResponseEntity<BookingTimeOverride> upsert(
            @PathVariable String beds24BookingId,
            @RequestBody Map<String, String> body) {
        AppUser user = securityUtils.getCurrentUser();
        BookingTimeOverride ov = repo.findByUserIdAndBeds24BookingId(user.getId(), beds24BookingId)
                .orElseGet(() -> {
                    BookingTimeOverride o = new BookingTimeOverride();
                    o.setUser(user);
                    o.setBeds24BookingId(beds24BookingId);
                    return o;
                });
        if (body.containsKey("checkinTime"))  ov.setCheckinTime(body.get("checkinTime"));
        if (body.containsKey("checkoutTime")) ov.setCheckoutTime(body.get("checkoutTime"));
        if (body.containsKey("note"))         ov.setNote(body.get("note"));
        return ResponseEntity.ok(repo.save(ov));
    }

    @DeleteMapping("/{beds24BookingId}")
    public ResponseEntity<Void> delete(@PathVariable String beds24BookingId) {
        Long userId = securityUtils.getCurrentUserId();
        repo.findByUserIdAndBeds24BookingId(userId, beds24BookingId)
                .ifPresent(repo::delete);
        return ResponseEntity.noContent().build();
    }
}
