package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.repository.BookingRepository;
import com.flowlyrent.repository.PropertyRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;

@RestController
@RequestMapping("/admin/stats")
@RequiredArgsConstructor
@Tag(name = "Statistiques et revenus")
public class AdminStatsController {

    private final BookingRepository bookingRepository;
    private final PropertyRepository propertyRepository;
    private final SecurityUtils securityUtils;

    @GetMapping
    public Map<String, Object> getStats() {
        Long userId = securityUtils.getCurrentUserId();
        LocalDate today = LocalDate.now();
        int year  = today.getYear();
        int month = today.getMonthValue();

        // KPI mois en cours
        BigDecimal revenueThisMonth = nvl(bookingRepository.revenueForMonth(userId, year, month));
        long bookingsThisMonth      = bookingRepository.countForMonth(userId, year, month);

        // KPI mois précédent
        LocalDate prevMonthDate = today.minusMonths(1);
        BigDecimal revenueLastMonth = nvl(bookingRepository.revenueForMonth(
                userId, prevMonthDate.getYear(), prevMonthDate.getMonthValue()));
        long bookingsLastMonth = bookingRepository.countForMonth(
                userId, prevMonthDate.getYear(), prevMonthDate.getMonthValue());

        // Nombre total de logements
        long propertiesCount = propertyRepository.findByAppUser(securityUtils.getCurrentUser()).size();

        // Revenus 6 derniers mois
        LocalDate sixMonthsAgo = today.minusMonths(5).withDayOfMonth(1);
        List<Object[]> rawMonths = bookingRepository.revenueByMonth(userId, sixMonthsAgo);
        List<Map<String, Object>> monthlyRevenue = buildMonthlyRevenue(rawMonths, sixMonthsAgo, today);

        // Revenus par canal (année en cours)
        List<Object[]> rawChannels = bookingRepository.revenueByChannel(userId, year);
        List<Map<String, Object>> byChannel = new ArrayList<>();
        BigDecimal totalChannelRevenue = rawChannels.stream()
                .map(r -> nvl((BigDecimal) r[1])).reduce(BigDecimal.ZERO, BigDecimal::add);
        for (Object[] r : rawChannels) {
            String ch = r[0] != null ? r[0].toString() : "direct";
            BigDecimal rev = nvl((BigDecimal) r[1]);
            int pct = totalChannelRevenue.compareTo(BigDecimal.ZERO) > 0
                    ? rev.multiply(BigDecimal.valueOf(100)).divide(totalChannelRevenue, 0, java.math.RoundingMode.HALF_UP).intValue()
                    : 0;
            byChannel.add(Map.of("channel", ch, "revenue", rev, "count", ((Number) r[2]).longValue(), "pct", pct));
        }
        byChannel.sort(Comparator.comparingLong(m -> -((Number) m.get("revenue")).longValue()));

        return Map.of(
                "revenueThisMonth",  revenueThisMonth,
                "revenueLastMonth",  revenueLastMonth,
                "bookingsThisMonth", bookingsThisMonth,
                "bookingsLastMonth", bookingsLastMonth,
                "propertiesCount",   propertiesCount,
                "monthlyRevenue",    monthlyRevenue,
                "byChannel",         byChannel
        );
    }

    private List<Map<String, Object>> buildMonthlyRevenue(List<Object[]> raw, LocalDate from, LocalDate to) {
        // Index the DB results
        Map<String, BigDecimal> indexed = new LinkedHashMap<>();
        for (Object[] r : raw) {
            String key = r[0] + "-" + String.format("%02d", ((Number) r[1]).intValue());
            indexed.put(key, nvl((BigDecimal) r[2]));
        }

        // Fill all months in [from, to] even if no data
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate cursor = from;
        BigDecimal max = BigDecimal.ONE;
        while (!cursor.isAfter(to)) {
            String key = cursor.getYear() + "-" + String.format("%02d", cursor.getMonthValue());
            BigDecimal rev = indexed.getOrDefault(key, BigDecimal.ZERO);
            if (rev.compareTo(max) > 0) max = rev;
            String label = Month.of(cursor.getMonthValue())
                    .getDisplayName(TextStyle.SHORT, Locale.FRENCH);
            result.add(Map.of("label", label, "revenue", rev, "key", key));
            cursor = cursor.plusMonths(1);
        }
        // Compute pct for CSS bar height
        BigDecimal finalMax = max;
        result.forEach(m -> {
            BigDecimal rev = (BigDecimal) m.get("revenue");
            int pct = finalMax.compareTo(BigDecimal.ZERO) > 0
                    ? rev.multiply(BigDecimal.valueOf(100)).divide(finalMax, 0, java.math.RoundingMode.HALF_UP).intValue()
                    : 0;
            ((Map<String, Object>) m).put("pct", pct);
        });
        return result;
    }

    private BigDecimal nvl(BigDecimal v) { return v != null ? v : BigDecimal.ZERO; }
}
