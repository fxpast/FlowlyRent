package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.QontoTransaction;
import com.flowlyrent.repository.QontoTransactionRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/qonto")
@RequiredArgsConstructor
@Tag(name = "Qonto transactions")
public class AdminQontoController {

    private final QontoTransactionRepository transactionRepo;
    private final SecurityUtils securityUtils;

    @GetMapping("/transactions")
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String side) {

        Long userId = securityUtils.getCurrentUserId();
        List<QontoTransaction> txs;

        if (from != null && to != null) {
            txs = transactionRepo.findByUserIdAndSettledAtBetweenOrderBySettledAtDesc(
                    userId, LocalDate.parse(from), LocalDate.parse(to));
        } else {
            txs = transactionRepo.findByUserIdOrderBySettledAtDescEmittedAtDesc(userId);
        }

        return txs.stream()
                .filter(t -> category == null || category.isBlank() || category.equals(t.getCategory()))
                .filter(t -> side == null || side.isBlank() || side.equalsIgnoreCase(t.getSide()))
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    @PatchMapping("/transactions/{id}")
    public ResponseEntity<Map<String, Object>> patch(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        QontoTransaction tx = transactionRepo.findById(id).orElse(null);
        if (tx == null || !tx.getUser().getId().equals(userId)) return ResponseEntity.notFound().build();

        if (body.containsKey("category"))         tx.setCategory((String) body.get("category"));
        if (body.containsKey("ruleLabel"))        tx.setRuleLabel((String) body.get("ruleLabel"));
        if (body.containsKey("beds24PropertyId")) tx.setBeds24PropertyId((String) body.get("beds24PropertyId"));
        if (body.containsKey("userNote"))         tx.setUserNote((String) body.get("userNote"));
        if (body.containsKey("expenseRuleId")) {
            Object rid = body.get("expenseRuleId");
            tx.setExpenseRuleId(rid != null ? ((Number) rid).longValue() : null);
        }

        return ResponseEntity.ok(toMap(transactionRepo.save(tx)));
    }

    @GetMapping("/summary")
    public Map<String, Object> summary(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {

        Long userId = securityUtils.getCurrentUserId();
        LocalDate from, to;

        if (year != null && month != null) {
            YearMonth ym = YearMonth.of(year, month);
            from = ym.atDay(1);
            to = ym.atEndOfMonth();
        } else if (year != null) {
            from = LocalDate.of(year, 1, 1);
            to = LocalDate.of(year, 12, 31);
        } else {
            from = LocalDate.now().withDayOfMonth(1).minusMonths(11);
            to = LocalDate.now();
        }

        List<QontoTransaction> txs = transactionRepo.findByUserIdAndSettledAtBetweenOrderBySettledAtDesc(userId, from, to);

        // Totaux par catégorie
        Map<String, BigDecimal> byCategory = new LinkedHashMap<>();
        Map<String, BigDecimal> byMonth = new LinkedHashMap<>();
        BigDecimal totalDebits = BigDecimal.ZERO;
        BigDecimal totalCredits = BigDecimal.ZERO;
        int uncategorized = 0;

        for (QontoTransaction tx : txs) {
            if (tx.getAmount() == null) continue;

            if ("DEBIT".equalsIgnoreCase(tx.getSide())) {
                totalDebits = totalDebits.add(tx.getAmount());
            } else {
                totalCredits = totalCredits.add(tx.getAmount());
            }

            String cat = tx.getCategory() != null ? tx.getCategory() : "NON_CATEGORISE";
            if (tx.getCategory() == null) uncategorized++;
            byCategory.merge(cat, tx.getAmount(), BigDecimal::add);

            if (tx.getSettledAt() != null && "DEBIT".equalsIgnoreCase(tx.getSide())) {
                String monthKey = tx.getSettledAt().getYear() + "-"
                        + String.format("%02d", tx.getSettledAt().getMonthValue());
                byMonth.merge(monthKey, tx.getAmount(), BigDecimal::add);
            }
        }

        return Map.of(
                "from", from.toString(),
                "to", to.toString(),
                "totalDebits", totalDebits,
                "totalCredits", totalCredits,
                "transactionCount", txs.size(),
                "uncategorized", uncategorized,
                "byCategory", byCategory,
                "byMonth", byMonth
        );
    }

    private Map<String, Object> toMap(QontoTransaction t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("qontoId", t.getQontoId());
        m.put("label", t.getLabel());
        m.put("counterpartyName", t.getCounterpartyName());
        m.put("amount", t.getAmount());
        m.put("currency", t.getCurrency());
        m.put("side", t.getSide());
        m.put("status", t.getStatus());
        m.put("settledAt", t.getSettledAt() != null ? t.getSettledAt().toString() : null);
        m.put("emittedAt", t.getEmittedAt() != null ? t.getEmittedAt().toString() : null);
        m.put("bankAccountIban", t.getBankAccountIban());
        m.put("category", t.getCategory());
        m.put("ruleLabel", t.getRuleLabel());
        m.put("expenseRuleId", t.getExpenseRuleId());
        m.put("beds24PropertyId", t.getBeds24PropertyId());
        m.put("userNote", t.getUserNote());
        return m;
    }
}
