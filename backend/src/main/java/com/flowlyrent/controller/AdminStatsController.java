package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.service.Beds24ApiClient;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/stats")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Statistiques et revenus")
public class AdminStatsController {

    private final Beds24ApiClient beds24;
    private final Beds24AccountRepository accountRepo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<?> getStats() {
        try {
            Beds24Account account = requireAccount();
            String token = beds24.tokenFor(account);

            LocalDate today = LocalDate.now();
            int year = today.getYear();
            int month = today.getMonthValue();

            // Réservations du mois en cours
            List<Map<String, Object>> thisMonth = fetchBookings(token,
                    today.withDayOfMonth(1).toString(), today.toString());

            // Réservations du mois précédent
            LocalDate prevFirst = today.minusMonths(1).withDayOfMonth(1);
            LocalDate prevLast = today.withDayOfMonth(1).minusDays(1);
            List<Map<String, Object>> lastMonth = fetchBookings(token,
                    prevFirst.toString(), prevLast.toString());

            // Propriétés
            List<Map<String, Object>> properties = beds24.getProperties(token, Map.of());

            BigDecimal revenueThisMonth = sumRevenue(thisMonth);
            BigDecimal revenueLastMonth = sumRevenue(lastMonth);

            // 6 derniers mois
            List<Map<String, Object>> monthly = buildMonthly(token, today);

            // Répartition par canal (année en cours)
            List<Map<String, Object>> yearBookings = fetchBookings(token,
                    year + "-01-01", year + "-12-31");
            List<Map<String, Object>> byChannel = buildByChannel(yearBookings);

            return ResponseEntity.ok(Map.of(
                    "revenueThisMonth", revenueThisMonth,
                    "revenueLastMonth", revenueLastMonth,
                    "bookingsThisMonth", thisMonth.size(),
                    "bookingsLastMonth", lastMonth.size(),
                    "propertiesCount", properties.size(),
                    "monthlyRevenue", monthly,
                    "byChannel", byChannel
            ));
        } catch (Exception e) {
            log.warn("[Stats] Erreur : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private List<Map<String, Object>> fetchBookings(String token, String from, String to) throws Exception {
        return beds24.getBookings(token, Map.of(
                "arrivalFrom", from,
                "arrivalTo", to,
                "status", "confirmed"
        ));
    }

    private BigDecimal sumRevenue(List<Map<String, Object>> bookings) {
        return bookings.stream()
                .map(b -> decimal(b, "totalPrice"))
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private List<Map<String, Object>> buildMonthly(String token, LocalDate today) throws Exception {
        List<Map<String, Object>> result = new ArrayList<>();
        BigDecimal max = BigDecimal.ONE;

        List<Map<String, Object>> perMonth = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate m = today.minusMonths(i);
            LocalDate first = m.withDayOfMonth(1);
            LocalDate last = m.withDayOfMonth(m.lengthOfMonth());
            List<Map<String, Object>> bookings = fetchBookings(token, first.toString(), last.toString());
            BigDecimal rev = sumRevenue(bookings);
            if (rev.compareTo(max) > 0) max = rev;
            String label = Month.of(m.getMonthValue()).getDisplayName(TextStyle.SHORT, Locale.FRENCH);
            perMonth.add(Map.of("label", label, "revenue", rev, "count", bookings.size()));
        }
        BigDecimal finalMax = max;
        for (var entry : perMonth) {
            Map<String, Object> m = new LinkedHashMap<>(entry);
            BigDecimal rev = (BigDecimal) m.get("revenue");
            int pct = finalMax.compareTo(BigDecimal.ZERO) > 0
                    ? rev.multiply(BigDecimal.valueOf(100))
                        .divide(finalMax, 0, RoundingMode.HALF_UP).intValue()
                    : 0;
            m.put("pct", pct);
            result.add(m);
        }
        return result;
    }

    private List<Map<String, Object>> buildByChannel(List<Map<String, Object>> bookings) {
        Map<String, Long> counts = new TreeMap<>();
        Map<String, BigDecimal> revenues = new TreeMap<>();
        for (var b : bookings) {
            String ch = str(b, "channel");
            if (ch == null || ch.isBlank()) ch = "Direct";
            BigDecimal price = decimal(b, "totalPrice");
            if (price == null) price = BigDecimal.ZERO;
            counts.merge(ch, 1L, Long::sum);
            revenues.merge(ch, price, BigDecimal::add);
        }
        BigDecimal total = revenues.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> {
                    BigDecimal rev = revenues.getOrDefault(e.getKey(), BigDecimal.ZERO)
                            .setScale(2, RoundingMode.HALF_UP);
                    int pct = total.compareTo(BigDecimal.ZERO) > 0
                            ? rev.multiply(BigDecimal.valueOf(100))
                                .divide(total, 0, RoundingMode.HALF_UP).intValue()
                            : 0;
                    return Map.<String, Object>of("channel", e.getKey(), "count", e.getValue(),
                            "revenue", rev, "pct", pct);
                })
                .collect(Collectors.toList());
    }

    private Beds24Account requireAccount() {
        return accountRepo.findByAppUserId(securityUtils.getCurrentUserId())
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté"));
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key); return v != null ? v.toString() : null;
    }

    private BigDecimal decimal(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v == null) return null;
        try { return new BigDecimal(v.toString()); } catch (NumberFormatException e) { return null; }
    }
}
