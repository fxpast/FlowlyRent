package com.flowlyrent.service;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.LinenItem;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.model.enums.MovementDirection;
import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.HousekeepingTaskRepository;
import com.flowlyrent.repository.LinenItemRepository;
import com.flowlyrent.repository.LinenMovementRepository;
import com.flowlyrent.repository.PropertyConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Outils en lecture seule exposés au chatbot Gemini (function calling).
 * Toujours scopés sur l'utilisateur courant via SecurityUtils — aucun
 * identifiant utilisateur n'est jamais lu depuis les arguments fournis par Gemini.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotToolService {

    private final Beds24AccountRepository accountRepo;
    private final Beds24ApiClient beds24;
    private final Beds24ReportService b24ReportService;
    private final QontoService qontoService;
    private final HousekeepingReportService hkReportService;
    private final HousekeepingTaskRepository taskRepo;
    private final PropertyConfigRepository propConfigRepo;
    private final LinenItemRepository linenItemRepo;
    private final LinenMovementRepository linenMovementRepo;
    private final SecurityUtils securityUtils;

    public Map<String, Object> execute(String toolName, Map<String, Object> args) {
        if (args == null) args = Map.of();
        Long userId = securityUtils.getCurrentUserId();
        try {
            return switch (toolName) {
                case "get_properties" -> getProperties(userId);
                case "get_revenue" -> getRevenue(userId, intArg(args, "year"), intArg(args, "month"));
                case "get_arrivals" -> getArrivals(userId, dateArg(args, "date"));
                case "get_departures" -> getDepartures(userId, dateArg(args, "date"));
                case "get_ongoing_stays" -> getOngoingStays(userId, dateArg(args, "date"));
                case "get_reservations" -> getReservations(userId, dateArg(args, "from"), dateArg(args, "to"),
                        strArg(args, "propertyName"), strArg(args, "status"), strArg(args, "platform"));
                case "get_expenses_summary" -> getExpensesSummary(userId, intArg(args, "year"), intArg(args, "month"));
                case "get_transactions" -> getTransactions(userId, dateArg(args, "from"), dateArg(args, "to"),
                        strArg(args, "category"), strArg(args, "side"));
                case "get_housekeeping_tasks" -> getHousekeepingTasks(userId, dateArg(args, "from"), dateArg(args, "to"),
                        strArg(args, "propertyName"), strArg(args, "status"));
                case "get_housekeeping_costs" -> getHousekeepingCosts(userId, intArg(args, "year"), intArg(args, "month"));
                case "get_linen_stock" -> getLinenStock(userId, strArg(args, "propertyName"));
                case "block_dates" -> setBlackout(userId, strArg(args, "propertyName"), dateArg(args, "from"), dateArg(args, "to"), "blackout");
                case "unblock_dates" -> setBlackout(userId, strArg(args, "propertyName"), dateArg(args, "from"), dateArg(args, "to"), "none");
                default -> Map.of("error", "Outil inconnu : " + toolName);
            };
        } catch (IllegalStateException e) {
            return Map.of("error", e.getMessage());
        } catch (Exception e) {
            log.error("Erreur outil chatbot '{}' : {}", toolName, e.getMessage(), e);
            return Map.of("error", "Erreur lors de la récupération des données");
        }
    }

    // ─── Properties ─────────────────────────────────────────────────────────

    private Map<String, Object> getProperties(Long userId) throws Exception {
        Beds24Account account = requireBeds24Account(userId);
        String token = beds24.tokenFor(account);
        Map<String, String> shortNames = propertyShortNames(userId);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> p : beds24.getProperties(token, Map.of())) {
            String id = idStr(p.get("id") != null ? p.get("id") : p.get("propId"));
            String name = p.get("name") != null ? p.get("name").toString() : Objects.toString(p.get("propName"), id);
            result.add(Map.of("id", id, "name", shortNames.getOrDefault(id, name)));
        }
        return Map.of("properties", result);
    }

    // ─── Revenus / marge ────────────────────────────────────────────────────

    private Map<String, Object> getRevenue(Long userId, int year, int month) throws Exception {
        Beds24Account account = requireBeds24Account(userId);
        Map<String, Object> ca = b24ReportService.caMonthly(account, year, month);

        BigDecimal caTotal = (BigDecimal) ca.get("caTotal");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> caByProperty = (List<Map<String, Object>>) ca.get("byProperty");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("monthLabel", ca.get("monthLabel"));
        result.put("year", year);
        result.put("month", month);
        result.put("caTotal", caTotal);
        result.put("nights", ca.get("nights"));
        result.put("occupancyRate", ca.get("occupancyRate"));

        List<Map<String, Object>> byProperty = new ArrayList<>();
        for (Map<String, Object> row : caByProperty) {
            byProperty.add(Map.of(
                    "propertyName", row.get("propertyName"),
                    "ca", row.get("ca"),
                    "nights", row.get("nights")
            ));
        }
        result.put("byProperty", byProperty);

        // Marge bénéficiaire (si Qonto connecté)
        try {
            Map<String, Object> summary = qontoService.fetchSummary(userId, year, month);
            BigDecimal totalDebits = (BigDecimal) summary.get("totalDebits");
            result.put("totalExpenses", totalDebits);
            result.put("profitMargin", caTotal.subtract(totalDebits));

            @SuppressWarnings("unchecked")
            Map<String, BigDecimal> debitsByProp = (Map<String, BigDecimal>) summary.get("byProperty");

            List<Map<String, Object>> marginByProperty = new ArrayList<>();
            for (Map<String, Object> row : caByProperty) {
                String propId = Objects.toString(row.get("propId"), null);
                BigDecimal caProp = (BigDecimal) row.get("ca");
                BigDecimal expenses = debitsByProp.getOrDefault(propId, BigDecimal.ZERO);
                marginByProperty.add(Map.of(
                        "propertyName", row.get("propertyName"),
                        "ca", caProp,
                        "expenses", expenses,
                        "margin", caProp.subtract(expenses)
                ));
            }
            result.put("marginByProperty", marginByProperty);
        } catch (IllegalStateException ignored) {
            // Qonto non connecté : pas de marge, on renvoie uniquement le CA
        }

        return result;
    }

    // ─── Arrivées / départs / réservations ─────────────────────────────────

    private Map<String, Object> getArrivals(Long userId, LocalDate date) throws Exception {
        if (date == null) date = LocalDate.now();
        Beds24Account account = requireBeds24Account(userId);
        String token = beds24.tokenFor(account);
        List<Map<String, Object>> bookings = beds24.getBookings(token,
                Map.of("arrivalFrom", date.toString(), "arrivalTo", date.toString()));
        Map<String, String> propNames = propertyNames(userId, token);

        List<Map<String, Object>> result = bookings.stream()
                .filter(this::isActiveStatus)
                .map(b -> simplifyBooking(b, propNames))
                .collect(Collectors.toList());
        return Map.of("date", date.toString(), "arrivals", result);
    }

    private Map<String, Object> getDepartures(Long userId, LocalDate date) throws Exception {
        if (date == null) date = LocalDate.now();
        Beds24Account account = requireBeds24Account(userId);
        String token = beds24.tokenFor(account);
        List<Map<String, Object>> bookings = beds24.getBookings(token,
                Map.of("departureFrom", date.toString(), "departureTo", date.toString()));
        Map<String, String> propNames = propertyNames(userId, token);

        List<Map<String, Object>> result = bookings.stream()
                .filter(this::isActiveStatus)
                .map(b -> simplifyBooking(b, propNames))
                .collect(Collectors.toList());
        return Map.of("date", date.toString(), "departures", result);
    }

    private Map<String, Object> getOngoingStays(Long userId, LocalDate date) throws Exception {
        if (date == null) date = LocalDate.now();
        Beds24Account account = requireBeds24Account(userId);
        String token = beds24.tokenFor(account);

        String today = date.toString();
        String yesterday = date.minusDays(1).toString();
        String pastLimit = date.minusDays(90).toString();

        List<Map<String, Object>> recentPast = beds24.getBookings(token,
                Map.of("arrivalFrom", pastLimit, "arrivalTo", yesterday));
        Map<String, String> propNames = propertyNames(userId, token);

        List<Map<String, Object>> ongoing = recentPast.stream()
                .filter(this::isActiveStatus)
                .filter(b -> truncateDate(b.get("departure")).compareTo(today) > 0)
                .map(b -> simplifyBooking(b, propNames))
                .collect(Collectors.toList());
        return Map.of("date", today, "ongoingStays", ongoing);
    }

    private Map<String, Object> getReservations(Long userId, LocalDate from, LocalDate to,
                                                  String propertyName, String status, String platform) throws Exception {
        if (from == null) from = LocalDate.now().withDayOfMonth(1);
        if (to == null) to = from.plusMonths(1).minusDays(1);

        Beds24Account account = requireBeds24Account(userId);
        String token = beds24.tokenFor(account);
        List<Map<String, Object>> bookings = beds24.getBookings(token,
                Map.of("arrivalFrom", from.toString(), "arrivalTo", to.toString()));
        Map<String, String> propNames = propertyNames(userId, token);
        String propId = resolvePropertyId(userId, propertyName);

        List<Map<String, Object>> result = bookings.stream()
                .filter(b -> propId == null || propId.equals(idStr(b.get("propId") != null ? b.get("propId") : b.get("propertyId"))))
                .filter(b -> status == null || status.equalsIgnoreCase(Objects.toString(b.get("status"), "")))
                .filter(b -> platform == null || platform.equalsIgnoreCase(Objects.toString(b.getOrDefault("channel", "Direct"), "Direct")))
                .map(b -> simplifyBooking(b, propNames))
                .collect(Collectors.toList());
        return Map.of("from", from.toString(), "to", to.toString(), "reservations", result);
    }

    // ─── Qonto ──────────────────────────────────────────────────────────────

    private Map<String, Object> getExpensesSummary(Long userId, int year, int month) {
        Map<String, Object> summary = qontoService.fetchSummary(userId, year, month);
        Map<String, Object> result = new LinkedHashMap<>(summary);

        @SuppressWarnings("unchecked")
        Map<String, BigDecimal> byProperty = (Map<String, BigDecimal>) summary.get("byProperty");
        if (byProperty != null && !byProperty.isEmpty()) {
            Map<String, String> names = propertyShortNames(userId);
            Map<String, BigDecimal> named = new LinkedHashMap<>();
            byProperty.forEach((propId, amount) -> named.put(names.getOrDefault(propId, propId), amount));
            result.put("byProperty", named);
        }
        return result;
    }

    private Map<String, Object> getTransactions(Long userId, LocalDate from, LocalDate to, String category, String side) {
        if (from == null) from = LocalDate.now().withDayOfMonth(1);
        if (to == null) to = LocalDate.now();

        Map<String, String> names = propertyShortNames(userId);
        List<Map<String, Object>> result = qontoService.fetchTransactions(userId, from, to).stream()
                .filter(tx -> category == null || category.equalsIgnoreCase(Objects.toString(tx.get("category"), "")))
                .filter(tx -> side == null || side.equalsIgnoreCase(Objects.toString(tx.get("side"), "")))
                .map(tx -> {
                    String propId = tx.get("beds24PropertyId") != null ? tx.get("beds24PropertyId").toString() : null;
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", truncateDate(tx.get("settled_at")));
                    m.put("label", tx.get("label"));
                    m.put("amount", tx.get("amount"));
                    m.put("side", tx.get("side"));
                    m.put("category", tx.get("category"));
                    m.put("propertyName", propId != null ? names.getOrDefault(propId, propId) : null);
                    return m;
                })
                .limit(100)
                .collect(Collectors.toList());
        return Map.of("from", from.toString(), "to", to.toString(), "transactions", result);
    }

    // ─── Entretien ──────────────────────────────────────────────────────────

    private Map<String, Object> getHousekeepingTasks(Long userId, LocalDate from, LocalDate to,
                                                       String propertyName, String status) {
        if (from == null) from = LocalDate.now();
        if (to == null) to = from.plusDays(30);
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.atTime(LocalTime.MAX);

        String propId = resolvePropertyId(userId, propertyName);
        List<HousekeepingTask> tasks = propId != null
                ? taskRepo.findByUserIdAndBeds24PropertyIdAndScheduledDateBetweenOrderByScheduledDateAsc(userId, propId, start, end)
                : taskRepo.findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(userId, start, end);

        TaskStatus statusFilter = null;
        if (status != null) {
            try {
                statusFilter = TaskStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // statut inconnu : pas de filtre
            }
        }
        final TaskStatus sf = statusFilter;

        List<Map<String, Object>> result = tasks.stream()
                .filter(t -> sf == null || t.getStatus() == sf)
                .map(t -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", t.getScheduledDate().toLocalDate().toString());
                    m.put("propertyName", t.getPropertyName() != null ? t.getPropertyName() : t.getBeds24PropertyId());
                    m.put("type", t.getType().name());
                    m.put("status", t.getStatus().name());
                    m.put("staff", t.getStaff() != null ? t.getStaff().getFullName() : null);
                    m.put("hasIncident", t.getHasIncident());
                    return m;
                })
                .collect(Collectors.toList());
        return Map.of("from", from.toString(), "to", to.toString(), "tasks", result);
    }

    private Map<String, Object> getHousekeepingCosts(Long userId, int year, int month) {
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());
        Map<String, Object> summary = hkReportService.costSummary(userId, from, to);
        Map<String, Object> result = new LinkedHashMap<>(summary);

        @SuppressWarnings("unchecked")
        Map<String, BigDecimal> byProperty = (Map<String, BigDecimal>) summary.get("byProperty");
        if (byProperty != null) {
            Map<String, String> names = propertyShortNames(userId);
            Map<String, BigDecimal> named = new LinkedHashMap<>();
            byProperty.forEach((propId, amount) -> named.put(names.getOrDefault(propId, propId), amount));
            result.put("byProperty", named);
        }
        return result;
    }

    // ─── Blanchisserie ──────────────────────────────────────────────────────

    private Map<String, Object> getLinenStock(Long userId, String propertyName) {
        String propId = resolvePropertyId(userId, propertyName);
        if (propId == null) {
            return Map.of("error", "Logement introuvable : " + propertyName);
        }
        List<LinenItem> items = linenItemRepo.findByUserIdAndBeds24PropertyIdOrderBySortOrderAscLabelAsc(userId, propId);
        List<Map<String, Object>> result = items.stream().map(item -> {
            long toLaundry = linenMovementRepo.sumByItemAndDirection(item.getId(), MovementDirection.TO_LAUNDRY);
            long fromLaundry = linenMovementRepo.sumByItemAndDirection(item.getId(), MovementDirection.FROM_LAUNDRY);
            long atLaundry = Math.max(0, toLaundry - fromLaundry);
            long atProperty = Math.max(0, item.getTotalQuantity() - atLaundry);

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("label", item.getLabel());
            m.put("category", item.getCategory().name());
            m.put("atProperty", atProperty);
            m.put("atLaundry", atLaundry);
            m.put("minThreshold", item.getMinThreshold());
            m.put("lowStock", item.getMinThreshold() != null && atProperty < item.getMinThreshold());
            return m;
        }).collect(Collectors.toList());
        return Map.of("propertyName", propertyName, "items", result);
    }

    // ─── Calendrier (action d'écriture) ────────────────────────────────────

    /**
     * Bloque ("blackout") ou débloque ("none") une plage de dates pour un logement.
     * Reproduit la logique de AdminAvailabilityController.setBlackout.
     */
    private Map<String, Object> setBlackout(Long userId, String propertyName, LocalDate from, LocalDate to, String override) throws Exception {
        if (from == null || to == null) {
            return Map.of("error", "Dates de début et de fin requises (AAAA-MM-JJ).");
        }
        if (to.isBefore(from)) {
            return Map.of("error", "La date de fin doit être postérieure ou égale à la date de début.");
        }
        String propId = resolvePropertyId(userId, propertyName);
        if (propId == null) {
            return Map.of("error", "Logement introuvable : " + propertyName);
        }

        Beds24Account account = requireBeds24Account(userId);
        String token = beds24.tokenFor(account);

        Map<String, String> calParams = new HashMap<>();
        calParams.put("startDate", from.toString());
        calParams.put("endDate", to.toString());
        List<Map<String, Object>> rooms = beds24.getCalendar(token, calParams);
        String roomId = rooms.stream()
                .filter(r -> propId.equals(idStr(r.get("propertyId"))))
                .map(r -> idStr(r.get("roomId")))
                .findFirst()
                .orElse(null);
        if (roomId == null) {
            return Map.of("error", "Chambre introuvable pour ce logement.");
        }

        beds24.updateCalendar(token, List.of(Map.of(
                "roomId", Long.parseLong(roomId),
                "calendar", List.of(Map.of("from", from.toString(), "to", to.toString(), "override", override))
        )));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("propertyName", propertyName);
        result.put("from", from.toString());
        result.put("to", to.toString());
        result.put("action", "blackout".equals(override) ? "blocked" : "unblocked");
        return result;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private Beds24Account requireBeds24Account(Long userId) {
        return accountRepo.findByAppUserId(userId)
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté. Rendez-vous dans Paramètres pour le connecter."));
    }

    private Map<String, String> propertyShortNames(Long userId) {
        Map<String, String> names = new HashMap<>();
        for (PropertyConfig cfg : propConfigRepo.findByUserId(userId)) {
            if (cfg.getShortName() != null && !cfg.getShortName().isBlank()) {
                names.put(cfg.getBeds24PropertyId(), cfg.getShortName());
            }
        }
        return names;
    }

    private Map<String, String> propertyNames(Long userId, String token) throws Exception {
        Map<String, String> names = new HashMap<>();
        for (Map<String, Object> p : beds24.getProperties(token, Map.of())) {
            String id = idStr(p.get("id") != null ? p.get("id") : p.get("propId"));
            String name = p.get("name") != null ? p.get("name").toString() : Objects.toString(p.get("propName"), id);
            if (id != null) names.put(id, name);
        }
        names.putAll(propertyShortNames(userId));
        return names;
    }

    /**
     * Résout un nom de logement (saisi librement par l'hôte) en beds24PropertyId,
     * par correspondance partielle insensible à la casse sur le shortName configuré
     * puis, en repli, sur le nom Beds24.
     */
    private String resolvePropertyId(Long userId, String propertyName) {
        if (propertyName == null || propertyName.isBlank()) return null;
        String needle = propertyName.toLowerCase().trim();

        for (PropertyConfig cfg : propConfigRepo.findByUserId(userId)) {
            if (cfg.getShortName() != null && cfg.getShortName().toLowerCase().contains(needle)) {
                return cfg.getBeds24PropertyId();
            }
        }

        try {
            Beds24Account account = requireBeds24Account(userId);
            String token = beds24.tokenFor(account);
            for (Map<String, Object> p : beds24.getProperties(token, Map.of())) {
                String name = p.get("name") != null ? p.get("name").toString() : Objects.toString(p.get("propName"), "");
                if (name.toLowerCase().contains(needle)) {
                    return idStr(p.get("id") != null ? p.get("id") : p.get("propId"));
                }
            }
        } catch (Exception ignored) {
            // Beds24 non connecté ou indisponible : pas de repli possible
        }
        return null;
    }

    private Map<String, Object> simplifyBooking(Map<String, Object> b, Map<String, String> propNames) {
        String propId = idStr(b.get("propId") != null ? b.get("propId") : b.get("propertyId"));
        String first = Objects.toString(b.get("guestFirstName") != null ? b.get("guestFirstName") : b.get("firstName"), "");
        String last = Objects.toString(b.get("guestLastName") != null ? b.get("guestLastName") : b.get("lastName"), "");
        String guest = (first + " " + last).trim();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("guestName", guest.isEmpty() ? "Voyageur" : guest);
        m.put("propertyName", propNames.getOrDefault(propId, propId));
        m.put("arrival", truncateDate(b.get("arrival")));
        m.put("departure", truncateDate(b.get("departure")));
        m.put("nights", nightsBetween(b));
        m.put("numAdult", b.get("numAdult"));
        m.put("totalPrice", b.get("totalPrice") != null ? b.get("totalPrice") : b.get("price"));
        m.put("channel", Objects.toString(b.get("channel"), "Direct"));
        m.put("status", b.get("status"));
        return m;
    }

    private boolean isActiveStatus(Map<String, Object> b) {
        String status = Objects.toString(b.get("status"), "").toLowerCase();
        return status.equals("new") || status.equals("confirmed");
    }

    private long nightsBetween(Map<String, Object> b) {
        try {
            LocalDate arrival = LocalDate.parse(truncateDate(b.get("arrival")));
            LocalDate departure = LocalDate.parse(truncateDate(b.get("departure")));
            return ChronoUnit.DAYS.between(arrival, departure);
        } catch (Exception e) {
            return 0;
        }
    }

    private String truncateDate(Object v) {
        String s = Objects.toString(v, "");
        return s.length() >= 10 ? s.substring(0, 10) : s;
    }

    private String idStr(Object v) {
        if (v == null) return null;
        String s = v.toString();
        if (s.contains(".")) {
            try {
                return String.valueOf((long) Double.parseDouble(s));
            } catch (NumberFormatException ignored) {
                // pas un nombre décimal
            }
        }
        return s.isBlank() ? null : s;
    }

    // ─── Arg parsing ────────────────────────────────────────────────────────

    private int intArg(Map<String, Object> args, String key) {
        Object v = args.get(key);
        if (v == null) {
            LocalDate now = LocalDate.now();
            return key.equals("year") ? now.getYear() : now.getMonthValue();
        }
        return ((Number) v).intValue();
    }

    private LocalDate dateArg(Map<String, Object> args, String key) {
        Object v = args.get(key);
        if (v == null) return null;
        String s = v.toString();
        return LocalDate.parse(s.length() >= 10 ? s.substring(0, 10) : s);
    }

    private String strArg(Map<String, Object> args, String key) {
        Object v = args.get(key);
        return v != null ? v.toString() : null;
    }
}
