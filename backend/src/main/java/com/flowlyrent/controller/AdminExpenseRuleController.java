package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.ExpenseRule;
import com.flowlyrent.repository.ExpenseRuleRepository;
import com.flowlyrent.service.QontoService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/expense-rules")
@RequiredArgsConstructor
@Tag(name = "Règles de dépenses")
public class AdminExpenseRuleController {

    private final ExpenseRuleRepository ruleRepo;
    private final SecurityUtils securityUtils;
    private final QontoService qontoService;

    @GetMapping
    public List<Map<String, Object>> list() {
        Long userId = securityUtils.getCurrentUserId();
        return ruleRepo.findByUserIdAndActiveTrue(userId)
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        AppUser user = securityUtils.getCurrentUser();
        ExpenseRule rule = new ExpenseRule();
        rule.setUser(user);
        applyBody(rule, body);
        return ResponseEntity.ok(toMap(ruleRepo.save(rule)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        ExpenseRule rule = ruleRepo.findById(id).orElse(null);
        if (rule == null || !rule.getUser().getId().equals(userId)) return ResponseEntity.notFound().build();
        applyBody(rule, body);
        ruleRepo.save(rule);

        // Recatégoriser les transactions après modification d'une règle
        List<ExpenseRule> rules = ruleRepo.findByUserIdAndActiveTrue(userId);
        qontoService.recategorizeAll(userId, rules);

        return ResponseEntity.ok(toMap(rule));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        ExpenseRule rule = ruleRepo.findById(id).orElse(null);
        if (rule == null || !rule.getUser().getId().equals(userId)) return ResponseEntity.notFound().build();
        rule.setActive(false);
        ruleRepo.save(rule);
        return ResponseEntity.ok().build();
    }

    @SuppressWarnings("unchecked")
    private void applyBody(ExpenseRule rule, Map<String, Object> body) {
        if (body.containsKey("category"))        rule.setCategory((String) body.get("category"));
        if (body.containsKey("label"))           rule.setLabel((String) body.get("label"));
        if (body.containsKey("beds24PropertyId")) rule.setBeds24PropertyId((String) body.get("beds24PropertyId"));
        if (body.containsKey("keywords")) {
            rule.setKeywords(body.get("keywords") instanceof List
                    ? (List<String>) body.get("keywords") : new ArrayList<>());
        }
        if (body.containsKey("altKeywords")) {
            rule.setAltKeywords(body.get("altKeywords") instanceof List
                    ? (List<String>) body.get("altKeywords") : new ArrayList<>());
        }
    }

    private Map<String, Object> toMap(ExpenseRule r) {
        return Map.of(
                "id", r.getId(),
                "category", r.getCategory(),
                "label", r.getLabel(),
                "beds24PropertyId", r.getBeds24PropertyId() != null ? r.getBeds24PropertyId() : "",
                "keywords", r.getKeywords(),
                "altKeywords", r.getAltKeywords(),
                "active", r.isActive(),
                "createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : ""
        );
    }
}
