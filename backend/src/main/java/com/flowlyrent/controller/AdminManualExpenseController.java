package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.ManualExpense;
import com.flowlyrent.repository.ManualExpenseRepository;
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
@RequestMapping("/admin/manual-expenses")
@RequiredArgsConstructor
@Tag(name = "Dépenses manuelles")
public class AdminManualExpenseController {

    private final ManualExpenseRepository expenseRepo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        if (year  == 0) year  = LocalDate.now().getYear();
        if (month == 0) month = LocalDate.now().getMonthValue();
        Long userId = securityUtils.getCurrentUserId();
        return expenseRepo.findByUserIdAndYearAndMonthOrderByLabelAsc(userId, year, month)
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        AppUser user = securityUtils.getCurrentUser();
        ManualExpense expense = new ManualExpense();
        expense.setUser(user);
        applyBody(expense, body);
        return ResponseEntity.ok(toMap(expenseRepo.save(expense)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        ManualExpense expense = expenseRepo.findById(id).orElse(null);
        if (expense == null || !expense.getUser().getId().equals(userId)) return ResponseEntity.notFound().build();
        applyBody(expense, body);
        return ResponseEntity.ok(toMap(expenseRepo.save(expense)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        ManualExpense expense = expenseRepo.findById(id).orElse(null);
        if (expense == null || !expense.getUser().getId().equals(userId)) return ResponseEntity.notFound().build();
        expenseRepo.delete(expense);
        return ResponseEntity.ok().build();
    }

    private void applyBody(ManualExpense expense, Map<String, Object> body) {
        if (body.containsKey("label")) expense.setLabel((String) body.get("label"));
        if (body.containsKey("amount")) expense.setAmount(new BigDecimal(body.get("amount").toString()));
        if (body.containsKey("beds24PropertyId")) {
            String propId = (String) body.get("beds24PropertyId");
            expense.setBeds24PropertyId(propId == null || propId.isBlank() ? null : propId);
        }
        if (body.containsKey("year")) expense.setYear(((Number) body.get("year")).intValue());
        if (body.containsKey("month")) expense.setMonth(((Number) body.get("month")).intValue());
    }

    private Map<String, Object> toMap(ManualExpense e) {
        return Map.of(
                "id", e.getId(),
                "label", e.getLabel(),
                "amount", e.getAmount(),
                "beds24PropertyId", e.getBeds24PropertyId() != null ? e.getBeds24PropertyId() : "",
                "year", e.getYear(),
                "month", e.getMonth(),
                "createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : ""
        );
    }
}
