package com.flowlyrent.service;

import com.flowlyrent.dto.ReportResult;
import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.repository.HousekeepingTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HousekeepingReportService {

    private final HousekeepingTaskRepository taskRepo;

    // --- HK_MONTH_BY_STAFF : tâches du mois groupées par agent ---

    public ReportResult monthByStaff(Long userId, LocalDate from, LocalDate to) {
        List<HousekeepingTask> tasks = taskRepo
                .findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        userId, from.atStartOfDay(), to.atTime(LocalTime.MAX));

        List<List<Object>> rows = tasks.stream().map(t -> List.<Object>of(
                t.getScheduledDate().toString(),
                t.getPropertyName() != null ? t.getPropertyName() : t.getBeds24PropertyId(),
                t.getType().name(),
                t.getStatus().name(),
                t.getStaff() != null ? t.getStaff().getFullName() : "—",
                t.getHourlyRate() != null ? t.getHourlyRate() : "—",
                t.getExtraHours() != null ? t.getExtraHours() : "—",
                cost(t)
        )).collect(Collectors.toList());

        Map<String, Object> summary = buildSummary(tasks);

        return ReportResult.builder()
                .type("HK_MONTH_BY_STAFF")
                .title("Ménage — détail par agent (" + from + " → " + to + ")")
                .params(Map.of("from", from.toString(), "to", to.toString()))
                .headers(List.of("Date", "Propriété", "Type", "Statut", "Agent", "Taux (€/h)", "Heures supp.", "Coût (€)"))
                .rows(rows)
                .summary(summary)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // --- HK_ANNUAL_BY_PROPERTY : résumé annuel par propriété ---

    public ReportResult annualByProperty(Long userId, int year) {
        LocalDate from = LocalDate.of(year, 1, 1);
        LocalDate to = LocalDate.of(year, 12, 31);
        List<HousekeepingTask> tasks = taskRepo
                .findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        userId, from.atStartOfDay(), to.atTime(LocalTime.MAX));

        Map<String, List<HousekeepingTask>> byProp = tasks.stream()
                .collect(Collectors.groupingBy(t ->
                        t.getPropertyName() != null ? t.getPropertyName() : t.getBeds24PropertyId()));

        List<List<Object>> rows = byProp.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    List<HousekeepingTask> pt = e.getValue();
                    long done = pt.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();
                    BigDecimal totalCost = pt.stream()
                            .map(this::cost)
                            .filter(c -> c != null)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return List.<Object>of(e.getKey(), pt.size(), done, totalCost);
                })
                .collect(Collectors.toList());

        Map<String, Object> summary = buildSummary(tasks);

        return ReportResult.builder()
                .type("HK_ANNUAL_BY_PROPERTY")
                .title("Ménage — résumé annuel par propriété (" + year + ")")
                .params(Map.of("year", String.valueOf(year)))
                .headers(List.of("Propriété", "Tâches totales", "Terminées", "Coût total (€)"))
                .rows(rows)
                .summary(summary)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // --- HK_ANNUAL_DETAIL : toutes les tâches de l'année ---

    public ReportResult annualDetail(Long userId, int year) {
        LocalDate from = LocalDate.of(year, 1, 1);
        LocalDate to = LocalDate.of(year, 12, 31);
        List<HousekeepingTask> tasks = taskRepo
                .findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        userId, from.atStartOfDay(), to.atTime(LocalTime.MAX));

        List<List<Object>> rows = tasks.stream().map(t -> List.<Object>of(
                t.getScheduledDate().toString(),
                Month.of(t.getScheduledDate().getMonthValue()).getDisplayName(TextStyle.FULL, Locale.FRENCH),
                t.getPropertyName() != null ? t.getPropertyName() : t.getBeds24PropertyId(),
                t.getType().name(),
                t.getStatus().name(),
                t.getStaff() != null ? t.getStaff().getFullName() : "—",
                cost(t)
        )).collect(Collectors.toList());

        Map<String, Object> summary = buildSummary(tasks);

        return ReportResult.builder()
                .type("HK_ANNUAL_DETAIL")
                .title("Ménage — détail complet " + year)
                .params(Map.of("year", String.valueOf(year)))
                .headers(List.of("Date", "Mois", "Propriété", "Type", "Statut", "Agent", "Coût (€)"))
                .rows(rows)
                .summary(summary)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // --- HK_BY_STAFF : tâches d'un agent sur une période ---

    public ReportResult byStaff(Long userId, Long staffId, LocalDate from, LocalDate to) {
        List<HousekeepingTask> tasks = taskRepo
                .findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        userId, from.atStartOfDay(), to.atTime(LocalTime.MAX))
                .stream()
                .filter(t -> t.getStaff() != null && t.getStaff().getId().equals(staffId))
                .collect(Collectors.toList());

        List<List<Object>> rows = tasks.stream().map(t -> List.<Object>of(
                t.getScheduledDate().toString(),
                t.getPropertyName() != null ? t.getPropertyName() : t.getBeds24PropertyId(),
                t.getType().name(),
                t.getStatus().name(),
                t.getHourlyRate() != null ? t.getHourlyRate() : "—",
                t.getExtraHours() != null ? t.getExtraHours() : "—",
                cost(t)
        )).collect(Collectors.toList());

        Map<String, Object> summary = buildSummary(tasks);

        String staffName = tasks.stream()
                .filter(t -> t.getStaff() != null)
                .findFirst()
                .map(t -> t.getStaff().getFullName())
                .orElse("Agent #" + staffId);

        return ReportResult.builder()
                .type("HK_BY_STAFF")
                .title("Ménage — " + staffName + " (" + from + " → " + to + ")")
                .params(Map.of("staffId", staffId.toString(), "from", from.toString(), "to", to.toString()))
                .headers(List.of("Date", "Propriété", "Type", "Statut", "Taux (€/h)", "Heures supp.", "Coût (€)"))
                .rows(rows)
                .summary(summary)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // --- HK_BY_PROPERTY : tâches d'une propriété sur une période ---

    public ReportResult byProperty(Long userId, String beds24PropertyId, LocalDate from, LocalDate to) {
        List<HousekeepingTask> tasks = taskRepo
                .findByUserIdAndBeds24PropertyIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        userId, beds24PropertyId, from.atStartOfDay(), to.atTime(LocalTime.MAX));

        List<List<Object>> rows = tasks.stream().map(t -> List.<Object>of(
                t.getScheduledDate().toString(),
                t.getType().name(),
                t.getStatus().name(),
                t.getStaff() != null ? t.getStaff().getFullName() : "—",
                cost(t)
        )).collect(Collectors.toList());

        Map<String, Object> summary = buildSummary(tasks);
        String propLabel = tasks.stream()
                .filter(t -> t.getPropertyName() != null)
                .findFirst()
                .map(HousekeepingTask::getPropertyName)
                .orElse(beds24PropertyId);

        return ReportResult.builder()
                .type("HK_BY_PROPERTY")
                .title("Ménage — " + propLabel + " (" + from + " → " + to + ")")
                .params(Map.of("beds24PropertyId", beds24PropertyId, "from", from.toString(), "to", to.toString()))
                .headers(List.of("Date", "Type", "Statut", "Agent", "Coût (€)"))
                .rows(rows)
                .summary(summary)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // --- Coût ménage + dépannage sur une période, total + par logement (pour la marge) ---

    public Map<String, Object> costSummary(Long userId, LocalDate from, LocalDate to) {
        List<HousekeepingTask> tasks = taskRepo
                .findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        userId, from.atStartOfDay(), to.atTime(LocalTime.MAX));

        Map<String, BigDecimal> byProperty = new LinkedHashMap<>();
        BigDecimal total = BigDecimal.ZERO;
        for (HousekeepingTask t : tasks) {
            if (t.getStatus() == TaskStatus.SKIPPED) continue;
            BigDecimal c = cost(t);
            if (c == null) continue;
            total = total.add(c);
            byProperty.merge(t.getBeds24PropertyId(), c, BigDecimal::add);
        }
        byProperty.replaceAll((k, v) -> v.setScale(2, RoundingMode.HALF_UP));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", total.setScale(2, RoundingMode.HALF_UP));
        result.put("byProperty", byProperty);
        return result;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private BigDecimal cost(HousekeepingTask t) {
        if (t.getHourlyRate() == null || t.getExtraHours() == null || t.getExtraHours() <= 0) return null;
        return BigDecimal.valueOf(t.getExtraHours()).multiply(t.getHourlyRate()).setScale(2, RoundingMode.HALF_UP);
    }

    private Map<String, Object> buildSummary(List<HousekeepingTask> tasks) {
        long total = tasks.size();
        long done = tasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();
        long pending = tasks.stream().filter(t -> t.getStatus() == TaskStatus.PENDING).count();
        BigDecimal totalCost = tasks.stream()
                .map(this::cost)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalTaches", total);
        summary.put("terminees", done);
        summary.put("enAttente", pending);
        summary.put("coutTotal", totalCost.setScale(2, RoundingMode.HALF_UP));
        return summary;
    }
}
