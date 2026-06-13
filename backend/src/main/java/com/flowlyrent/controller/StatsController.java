package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.service.Beds24ReportService;
import com.flowlyrent.service.HousekeepingReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/admin/stats")
@RequiredArgsConstructor
public class StatsController {

    private final Beds24ReportService reportService;
    private final HousekeepingReportService hkService;
    private final Beds24AccountRepository accountRepo;
    private final SecurityUtils securityUtils;

    /**
     * CA mensuel ventilé au prorata des nuits (réservations à cheval incluses).
     * Algorithme : itération jour par jour, price/nights par jour couvert.
     * GET /admin/stats/revenue?year=2026&month=6
     */
    @GetMapping("/revenue")
    public ResponseEntity<?> monthlyRevenue(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        try {
            Beds24Account account = accountRepo.findByAppUserId(securityUtils.getCurrentUserId())
                    .orElse(null);
            if (account == null) return ResponseEntity.status(400).body(Map.of("error", "Beds24 non connecté"));

            if (year  == 0) year  = LocalDate.now().getYear();
            if (month == 0) month = LocalDate.now().getMonthValue();

            Map<String, Object> result = reportService.caMonthly(account, year, month);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Coût ménage + dépannage du mois (total + par logement), pour le calcul de la marge.
     * GET /admin/stats/housekeeping-costs?year=2026&month=6
     */
    @GetMapping("/housekeeping-costs")
    public ResponseEntity<?> housekeepingCosts(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        if (year  == 0) year  = LocalDate.now().getYear();
        if (month == 0) month = LocalDate.now().getMonthValue();

        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to   = from.withDayOfMonth(from.lengthOfMonth());

        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(hkService.costSummary(userId, from, to));
    }
}
