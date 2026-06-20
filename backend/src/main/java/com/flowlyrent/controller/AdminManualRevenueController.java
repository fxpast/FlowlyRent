package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.ManualRevenue;
import com.flowlyrent.repository.ManualRevenueRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/manual-revenues")
@RequiredArgsConstructor
@Tag(name = "Revenus manuels")
public class AdminManualRevenueController {

    private final ManualRevenueRepository revenueRepo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        if (year  == 0) year  = LocalDate.now().getYear();
        if (month == 0) month = LocalDate.now().getMonthValue();
        Long userId = securityUtils.getCurrentUserId();
        return revenueRepo.findForPeriod(userId, year, month)
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        AppUser user = securityUtils.getCurrentUser();
        ManualRevenue revenue = new ManualRevenue();
        revenue.setUser(user);
        applyBody(revenue, body);
        return ResponseEntity.ok(toMap(revenueRepo.save(revenue)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        ManualRevenue revenue = revenueRepo.findById(id).orElse(null);
        if (revenue == null || !revenue.getUser().getId().equals(userId)) return ResponseEntity.notFound().build();
        applyBody(revenue, body);
        return ResponseEntity.ok(toMap(revenueRepo.save(revenue)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        ManualRevenue revenue = revenueRepo.findById(id).orElse(null);
        if (revenue == null || !revenue.getUser().getId().equals(userId)) return ResponseEntity.notFound().build();
        revenueRepo.delete(revenue);
        return ResponseEntity.ok().build();
    }

    private void applyBody(ManualRevenue revenue, Map<String, Object> body) {
        if (body.containsKey("label")) revenue.setLabel((String) body.get("label"));
        if (body.containsKey("amount")) revenue.setAmount(new BigDecimal(body.get("amount").toString()));
        if (body.containsKey("beds24PropertyId")) {
            String propId = (String) body.get("beds24PropertyId");
            revenue.setBeds24PropertyId(propId == null || propId.isBlank() ? null : propId);
        }
        if (body.containsKey("year")) revenue.setYear(((Number) body.get("year")).intValue());
        if (body.containsKey("month")) revenue.setMonth(((Number) body.get("month")).intValue());
        if (body.containsKey("recurring")) revenue.setRecurring(Boolean.TRUE.equals(body.get("recurring")));
    }

    private Map<String, Object> toMap(ManualRevenue e) {
        return Map.of(
                "id", e.getId(),
                "label", e.getLabel(),
                "amount", e.getAmount(),
                "beds24PropertyId", e.getBeds24PropertyId() != null ? e.getBeds24PropertyId() : "",
                "year", e.getYear(),
                "month", e.getMonth(),
                "recurring", e.isRecurring(),
                "createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : ""
        );
    }
}
