package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.service.QontoService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/qonto")
@RequiredArgsConstructor
@Tag(name = "Qonto transactions")
public class AdminQontoController {

    private final QontoService qontoService;
    private final SecurityUtils securityUtils;

    @GetMapping("/transactions")
    public ResponseEntity<List<Map<String, Object>>> transactions(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String side) {

        Long userId = securityUtils.getCurrentUserId();
        LocalDate dateFrom = from != null ? LocalDate.parse(from) : LocalDate.now().minusMonths(1);
        LocalDate dateTo   = to   != null ? LocalDate.parse(to)   : LocalDate.now();

        try {
            List<Map<String, Object>> txs = qontoService.fetchTransactions(userId, dateFrom, dateTo);

            if (category != null && !category.isBlank()) {
                txs = txs.stream()
                        .filter(t -> category.equals(t.get("category")))
                        .toList();
            }
            if (side != null && !side.isBlank()) {
                final String s = side.toLowerCase();
                txs = txs.stream()
                        .filter(t -> s.equals(t.getOrDefault("side", "").toString().toLowerCase()))
                        .toList();
            }

            return ResponseEntity.ok(txs);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(424).body(List.of(Map.of("error", e.getMessage())));
        }
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {

        Long userId = securityUtils.getCurrentUserId();
        try {
            return ResponseEntity.ok(qontoService.fetchSummary(userId, year, month));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(424).body(Map.of("error", e.getMessage()));
        }
    }
}
