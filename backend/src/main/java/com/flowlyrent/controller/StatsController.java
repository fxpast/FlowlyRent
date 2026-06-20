package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.IcalBooking;
import com.flowlyrent.model.LocalProperty;
import com.flowlyrent.model.enums.ChannelType;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.IcalBookingRepository;
import com.flowlyrent.repository.LocalPropertyRepository;
import com.flowlyrent.service.Beds24ReportService;
import com.flowlyrent.service.HousekeepingReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/stats")
@RequiredArgsConstructor
public class StatsController {

    private final Beds24ReportService reportService;
    private final HousekeepingReportService hkService;
    private final Beds24AccountRepository accountRepo;
    private final AppUserRepository userRepo;
    private final IcalBookingRepository icalBookingRepo;
    private final LocalPropertyRepository localPropertyRepo;
    private final SecurityUtils securityUtils;

    @GetMapping("/revenue")
    public ResponseEntity<?> monthlyRevenue(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        try {
            if (year  == 0) year  = LocalDate.now().getYear();
            if (month == 0) month = LocalDate.now().getMonthValue();

            Long userId = securityUtils.getCurrentUserId();
            var user = userRepo.findById(userId).orElse(null);

            if (user != null && user.getChannelType() == ChannelType.ICAL) {
                return ResponseEntity.ok(caIcal(userId, year, month));
            }

            Beds24Account account = accountRepo.findByAppUserId(userId).orElse(null);
            if (account == null) return ResponseEntity.status(400).body(Map.of("error", "Beds24 non connecté"));

            Map<String, Object> result = reportService.caMonthly(account, year, month);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

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

    private Map<String, Object> caIcal(Long userId, int year, int month) {
        LocalDate firstDay = LocalDate.of(year, month, 1);
        LocalDate lastDay  = firstDay.withDayOfMonth(firstDay.lengthOfMonth());
        int daysInMonth    = firstDay.lengthOfMonth();
        String monthLabel  = Month.of(month).getDisplayName(TextStyle.FULL, Locale.FRENCH);

        List<LocalProperty> properties = localPropertyRepo.findByUserIdOrderByCreatedAtAsc(userId);

        List<IcalBooking> bookings = icalBookingRepo
            .findByUserIdAndArrivalLessThanAndDepartureGreaterThan(
                userId, lastDay.plusDays(1), firstDay.minusDays(1)
            );

        Map<Long, Integer> nightsByProp = new HashMap<>();
        int totalNights = 0;
        for (IcalBooking b : bookings) {
            if (b.getLocalProperty() == null) continue;
            LocalDate start = b.getArrival().isBefore(firstDay) ? firstDay : b.getArrival();
            LocalDate end   = b.getDeparture().isAfter(lastDay.plusDays(1)) ? lastDay.plusDays(1) : b.getDeparture();
            int nights = (int) ChronoUnit.DAYS.between(start, end);
            if (nights > 0) {
                nightsByProp.merge(b.getLocalProperty().getId(), nights, Integer::sum);
                totalNights += nights;
            }
        }

        int propCount = properties.size();
        double occupancyRate = propCount > 0 && daysInMonth > 0
            ? Math.round((double) totalNights / (daysInMonth * propCount) * 10000.0) / 100.0
            : 0;

        List<Map<String, Object>> byProperty = properties.stream()
            .map(p -> {
                int nights = nightsByProp.getOrDefault(p.getId(), 0);
                String name = (p.getShortName() != null && !p.getShortName().isBlank())
                    ? p.getShortName() : p.getName();
                return Map.<String, Object>of(
                    "propId",        String.valueOf(p.getId()),
                    "propertyName",  name,
                    "ca",            BigDecimal.ZERO,
                    "nights",        nights,
                    "commission",    BigDecimal.ZERO
                );
            })
            .filter(p -> (int) p.get("nights") > 0)
            .collect(Collectors.toList());

        return Map.of(
            "year",           year,
            "month",          month,
            "monthLabel",     monthLabel,
            "caTotal",        BigDecimal.ZERO,
            "commissionTotal",BigDecimal.ZERO,
            "nights",         totalNights,
            "daysInMonth",    daysInMonth,
            "occupancyRate",  occupancyRate,
            "byProperty",     byProperty
        );
    }
}
