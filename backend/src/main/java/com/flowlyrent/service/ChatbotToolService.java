package com.flowlyrent.service;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.Feedback;
import com.flowlyrent.model.FaqSuggestion;
import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.LinenItem;
import com.flowlyrent.model.LocalEvent;
import com.flowlyrent.model.PricingEventImpactConfig;
import com.flowlyrent.model.PricingZone;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.model.enums.MovementDirection;
import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.FeedbackRepository;
import com.flowlyrent.repository.FaqSuggestionRepository;
import com.flowlyrent.repository.HousekeepingTaskRepository;
import com.flowlyrent.repository.LinenItemRepository;
import com.flowlyrent.repository.LinenMovementRepository;
import com.flowlyrent.repository.LocalEventRepository;
import com.flowlyrent.repository.ManualExpenseRepository;
import com.flowlyrent.repository.PricingEventImpactConfigRepository;
import com.flowlyrent.repository.PricingZoneRepository;
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
import java.util.stream.Stream;

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
    private final FeedbackRepository feedbackRepo;
    private final FaqSuggestionRepository faqSuggestionRepo;
    private final ManualExpenseRepository manualExpenseRepo;
    private final LocalEventRepository localEventRepo;
    private final PricingZoneRepository pricingZoneRepo;
    private final PricingEventImpactConfigRepository eventImpactConfigRepo;
    private final RoomIdResolverService roomIdResolver;
    private final SecurityUtils securityUtils;

    public Map<String, Object> execute(String toolName, Map<String, Object> args, String lang) {
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
                case "search_booking" -> searchBooking(userId, strArg(args, "guestName"),
                        strArg(args, "propertyName"), dateArg(args, "from"), dateArg(args, "to"),
                        strArg(args, "bookingId"));
                case "get_free_properties" -> getFreeProperties(userId, dateArg(args, "from"), dateArg(args, "to"));
                case "get_expenses_summary" -> getExpensesSummary(userId, intArg(args, "year"), intArg(args, "month"));
                case "get_transactions" -> getTransactions(userId, dateArg(args, "from"), dateArg(args, "to"),
                        strArg(args, "category"), strArg(args, "side"));
                case "get_housekeeping_tasks" -> getHousekeepingTasks(userId, dateArg(args, "from"), dateArg(args, "to"),
                        strArg(args, "propertyName"), strArg(args, "status"));
                case "get_housekeeping_costs" -> getHousekeepingCosts(userId, intArg(args, "year"), intArg(args, "month"));
                case "get_housekeeper_performance" -> getHousekeeperPerformance(userId,
                        dateArg(args, "from"), dateArg(args, "to"), strArg(args, "staffName"));
                case "get_linen_stock" -> getLinenStock(userId, strArg(args, "propertyName"));
                case "get_local_events" -> getLocalEvents(userId, dateArg(args, "from"), dateArg(args, "to"));
                case "block_dates" -> setBlackout(userId, strArg(args, "propertyName"), dateArg(args, "from"), dateArg(args, "to"), "blackout");
                case "unblock_dates" -> setBlackout(userId, strArg(args, "propertyName"), dateArg(args, "from"), dateArg(args, "to"), "none");
                case "suggest_faq" -> suggestFaq(userId, lang, strArg(args, "question"), strArg(args, "answer"));
                case "report_unhandled_action" -> reportUnhandledAction(userId, lang,
                        strArg(args, "action"), strArg(args, "userMessage"));
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

        // Commission plateforme (Beds24)
        BigDecimal commissionTotal = ca.get("commissionTotal") instanceof BigDecimal bd
                ? bd : BigDecimal.ZERO;

        // Charges manuelles du mois
        BigDecimal manualTotal = manualExpenseRepo.findForPeriod(userId, year, month).stream()
                .map(e -> e.getAmount() != null ? e.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Coûts ménage/dépannage du mois
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to   = from.withDayOfMonth(from.lengthOfMonth());
        Map<String, Object> hkSummary = hkReportService.costSummary(userId, from, to);
        BigDecimal hkTotal = hkSummary.get("total") instanceof BigDecimal bd ? bd : BigDecimal.ZERO;

        // Marge bénéficiaire (si Qonto connecté — même logique que le menu Revenus)
        try {
            Map<String, Object> summary = qontoService.fetchSummary(userId, year, month);
            BigDecimal totalDebits = (BigDecimal) summary.get("totalDebits");

            // Exclure NON_CATEGORISE (transactions non encore validées comme charges)
            @SuppressWarnings("unchecked")
            Map<String, BigDecimal> byCategory = (Map<String, BigDecimal>) summary.get("byCategory");
            BigDecimal nonCat = byCategory != null ? byCategory.getOrDefault("NON_CATEGORISE", BigDecimal.ZERO) : BigDecimal.ZERO;
            BigDecimal qontoExpenses = totalDebits.subtract(nonCat);

            BigDecimal totalDeductions = qontoExpenses.add(commissionTotal).add(hkTotal).add(manualTotal);
            BigDecimal margin = caTotal.subtract(totalDeductions);

            result.put("qonto_depenses_categoriees", qontoExpenses);
            result.put("qonto_non_categorise_exclu", nonCat);
            result.put("commission_plateforme", commissionTotal);
            result.put("couts_menage_depannage", hkTotal);
            result.put("charges_manuelles", manualTotal);
            result.put("total_deductions", totalDeductions);
            result.put("marge_beneficiaire_nette", margin);

            @SuppressWarnings("unchecked")
            Map<String, BigDecimal> debitsByProp = (Map<String, BigDecimal>) summary.get("byProperty");
            @SuppressWarnings("unchecked")
            Map<String, BigDecimal> hkByProp = (Map<String, BigDecimal>) hkSummary.get("byProperty");

            List<Map<String, Object>> marginByProperty = new ArrayList<>();
            for (Map<String, Object> row : caByProperty) {
                String propId = Objects.toString(row.get("propId"), null);
                BigDecimal caProp = (BigDecimal) row.get("ca");
                BigDecimal qontoProp = debitsByProp != null ? debitsByProp.getOrDefault(propId, BigDecimal.ZERO) : BigDecimal.ZERO;
                BigDecimal hkProp    = hkByProp    != null ? hkByProp.getOrDefault(propId, BigDecimal.ZERO)    : BigDecimal.ZERO;
                BigDecimal commProp  = row.get("commission") instanceof BigDecimal bc ? bc : BigDecimal.ZERO;
                BigDecimal manualProp = manualExpenseRepo.findForPeriod(userId, year, month).stream()
                        .filter(e -> propId != null && propId.equals(e.getBeds24PropertyId()))
                        .map(e -> e.getAmount() != null ? e.getAmount() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal depProp = qontoProp.add(hkProp).add(commProp).add(manualProp);
                marginByProperty.add(Map.of(
                        "propertyName", row.get("propertyName"),
                        "ca_logement", caProp,
                        "depenses_logement", depProp,
                        "marge_logement", caProp.subtract(depProp)
                ));
            }
            result.put("marge_par_logement", marginByProperty);
        } catch (IllegalStateException ignored) {
            // Qonto non connecté : on expose quand même commission et HK
            result.put("commission_plateforme", commissionTotal);
            result.put("couts_menage_depannage", hkTotal);
            result.put("charges_manuelles", manualTotal);
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

    private Map<String, Object> getFreeProperties(Long userId, LocalDate from, LocalDate to) throws Exception {
        if (from == null) from = LocalDate.now();
        if (to == null) to = from.plusDays(14);

        Beds24Account account = requireBeds24Account(userId);
        String token = beds24.tokenFor(account);
        Map<String, String> propNames = propertyNames(userId, token);

        List<String> allPropIds = new ArrayList<>();
        for (Map<String, Object> p : beds24.getProperties(token, Map.of())) {
            String id = idStr(p.get("id") != null ? p.get("id") : p.get("propId"));
            if (id != null) allPropIds.add(id);
        }

        // Requête large en arrière pour capturer les séjours déjà en cours
        final LocalDate finalFrom = from;
        final LocalDate finalTo = to;
        List<Map<String, Object>> bookings = beds24.getBookings(token,
                Map.of("arrivalFrom", from.minusDays(180).toString(), "arrivalTo", to.toString()));

        Set<String> occupiedIds = bookings.stream()
                .filter(this::isActiveStatus)
                .filter(b -> {
                    try {
                        LocalDate arrival   = LocalDate.parse(truncateDate(b.get("arrival")));
                        LocalDate departure = LocalDate.parse(truncateDate(b.get("departure")));
                        return arrival.isBefore(finalTo) && departure.isAfter(finalFrom);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .map(b -> idStr(b.get("propId") != null ? b.get("propId") : b.get("propertyId")))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<Map<String, Object>> free = allPropIds.stream()
                .filter(id -> !occupiedIds.contains(id))
                .map(id -> Map.<String, Object>of("id", id, "name", propNames.getOrDefault(id, id)))
                .collect(Collectors.toList());

        List<Map<String, Object>> occupied = allPropIds.stream()
                .filter(occupiedIds::contains)
                .map(id -> Map.<String, Object>of("id", id, "name", propNames.getOrDefault(id, id)))
                .collect(Collectors.toList());

        return Map.of(
                "from", from.toString(),
                "to", to.toString(),
                "freeCount", free.size(),
                "occupiedCount", occupied.size(),
                "freeProperties", free,
                "occupiedProperties", occupied
        );
    }

    private Map<String, Object> searchBooking(Long userId, String guestName, String propertyName,
                                               LocalDate from, LocalDate to, String bookingId) throws Exception {
        if (from == null) from = LocalDate.now().minusMonths(6);
        if (to   == null) to   = LocalDate.now().plusMonths(6);

        Beds24Account account = requireBeds24Account(userId);
        String token = beds24.tokenFor(account);
        Map<String, String> propNames = propertyNames(userId, token);
        String propId = resolvePropertyId(userId, propertyName);

        String needle = guestName != null ? guestName.toLowerCase().trim() : null;

        List<Map<String, Object>> bookings = beds24.getBookings(token,
                Map.of("arrivalFrom", from.toString(), "arrivalTo", to.toString()));

        List<Map<String, Object>> result = bookings.stream()
                .filter(b -> {
                    if (bookingId != null && !bookingId.isBlank()) {
                        String id = idStr(b.get("id") != null ? b.get("id") : b.get("bookingId"));
                        return bookingId.equals(id);
                    }
                    return true;
                })
                .filter(b -> propId == null || propId.equals(idStr(b.get("propId") != null ? b.get("propId") : b.get("propertyId"))))
                .filter(b -> {
                    if (needle == null) return true;
                    String first = Objects.toString(b.get("guestFirstName") != null ? b.get("guestFirstName") : b.get("firstName"), "").toLowerCase();
                    String last  = Objects.toString(b.get("guestLastName")  != null ? b.get("guestLastName")  : b.get("lastName"), "").toLowerCase();
                    return (first + " " + last).contains(needle) || first.contains(needle) || last.contains(needle);
                })
                .limit(20)
                .map(b -> detailedBooking(b, propNames))
                .collect(Collectors.toList());

        return Map.of("from", from.toString(), "to", to.toString(), "bookings", result, "count", result.size());
    }

    private Map<String, Object> detailedBooking(Map<String, Object> b, Map<String, String> propNames) {
        String propId = idStr(b.get("propId") != null ? b.get("propId") : b.get("propertyId"));
        String first  = Objects.toString(b.get("guestFirstName") != null ? b.get("guestFirstName") : b.get("firstName"), "").trim();
        String last   = Objects.toString(b.get("guestLastName")  != null ? b.get("guestLastName")  : b.get("lastName"),  "").trim();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("bookingId",     idStr(b.get("id") != null ? b.get("id") : b.get("bookingId")));
        m.put("guestName",     (first + " " + last).trim());
        m.put("email",         nonNull(b, "guestEmail", "email"));
        m.put("phone",         nonNull(b, "guestPhone", "phone"));
        m.put("propertyName",  propNames.getOrDefault(propId, propId));
        m.put("arrival",       truncateDate(b.get("arrival")));
        m.put("departure",     truncateDate(b.get("departure")));
        m.put("nights",        nightsBetween(b));
        m.put("numAdult",      b.get("numAdult"));
        m.put("numChild",      nonNull(b, "numChild", "numChildren"));
        m.put("totalPrice",    nonNull(b, "totalPrice", "price"));
        m.put("cleaningFee",   b.get("cleaningFee"));
        m.put("channel",       Objects.toString(b.get("channel"), "Direct"));
        m.put("status",        b.get("status"));
        m.put("notes",         nonNull(b, "guestNote", "internalNote", "message", "notes"));
        m.put("guestAddress",  nonNull(b, "guestAddress", "address"));
        m.put("guestCountry",  nonNull(b, "guestCountry", "country"));
        m.put("guestCity",     nonNull(b, "guestCity", "city"));
        return m;
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

    private Map<String, Object> getHousekeeperPerformance(Long userId, LocalDate from, LocalDate to, String staffName) {
        if (from == null) from = LocalDate.now().minusYears(5);
        if (to   == null) to   = LocalDate.now();

        List<HousekeepingTask> tasks = taskRepo.findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                userId, from.atStartOfDay(), to.atTime(LocalTime.MAX));

        String needle = staffName != null ? staffName.toLowerCase().trim() : null;

        // Grouper par prestataire (nom complet ou "Sans prestataire")
        Map<String, List<HousekeepingTask>> byStaff = new LinkedHashMap<>();
        for (HousekeepingTask t : tasks) {
            String name;
            if (t.getStaff() != null) {
                name = t.getStaff().getFullName();
            } else if (t.getHousekeeper() != null) {
                name = t.getHousekeeper().getName();
            } else {
                name = "Sans prestataire";
            }
            if (needle != null && !name.toLowerCase().contains(needle)) continue;
            byStaff.computeIfAbsent(name, k -> new ArrayList<>()).add(t);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<HousekeepingTask>> entry : byStaff.entrySet()) {
            List<HousekeepingTask> staffTasks = entry.getValue();
            long total     = staffTasks.size();
            long done      = staffTasks.stream().filter(t -> t.getStatus() == com.flowlyrent.model.enums.TaskStatus.DONE).count();
            long skipped   = staffTasks.stream().filter(t -> t.getStatus() == com.flowlyrent.model.enums.TaskStatus.SKIPPED).count();
            long incidents = staffTasks.stream().filter(t -> Boolean.TRUE.equals(t.getHasIncident())).count();
            double rate    = total > 0 ? Math.round(done * 1000.0 / total) / 10.0 : 0.0;

            // Gains = hourlyRate × extraHours sur les tâches non-skippées (même logique que HousekeepingReportService)
            BigDecimal totalEarnings = staffTasks.stream()
                    .filter(t -> t.getStatus() != com.flowlyrent.model.enums.TaskStatus.SKIPPED)
                    .filter(t -> t.getHourlyRate() != null && t.getExtraHours() != null && t.getExtraHours() > 0)
                    .map(t -> t.getHourlyRate().multiply(BigDecimal.valueOf(t.getExtraHours()))
                            .setScale(2, java.math.RoundingMode.HALF_UP))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Set<String> properties = staffTasks.stream()
                    .map(t -> t.getPropertyName() != null ? t.getPropertyName() : t.getBeds24PropertyId())
                    .filter(Objects::nonNull)
                    .collect(Collectors.toCollection(LinkedHashSet::new));

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("staff", entry.getKey());
            m.put("totalTasks", total);
            m.put("doneTasks", done);
            m.put("skippedTasks", skipped);
            m.put("pendingTasks", total - done - skipped);
            m.put("incidents", incidents);
            m.put("completionRate", rate + "%");
            m.put("totalEarnings", totalEarnings.compareTo(BigDecimal.ZERO) > 0
                    ? totalEarnings.setScale(2, java.math.RoundingMode.HALF_UP) + "€" : "non renseigné");
            m.put("properties", new ArrayList<>(properties));
            result.add(m);
        }

        // Tri : taux de complétion décroissant
        result.sort((a, b) -> {
            double ra = parseRate((String) a.get("completionRate"));
            double rb = parseRate((String) b.get("completionRate"));
            return Double.compare(rb, ra);
        });

        return Map.of("from", from.toString(), "to", to.toString(), "staff", result, "count", result.size());
    }

    private double parseRate(String rate) {
        try { return Double.parseDouble(rate.replace("%", "").trim()); } catch (Exception e) { return 0; }
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

    // ─── Événements locaux ──────────────────────────────────────────────────

    private Map<String, Object> getLocalEvents(Long userId, LocalDate from, LocalDate to) {
        if (to == null && from != null) to = from;

        Map<Long, String> zoneNames = new HashMap<>();
        for (PricingZone z : pricingZoneRepo.findByUserId(userId)) {
            zoneNames.put(z.getId(), z.getName());
        }

        PricingEventImpactConfig impactConfig = eventImpactConfigRepo.findByUserId(userId)
                .orElseGet(PricingEventImpactConfig::new);

        final LocalDate filterFrom = from;
        final LocalDate filterTo = to;

        List<Map<String, Object>> result = localEventRepo.findByUserIdOrderByStartDateAsc(userId).stream()
                .filter(e -> {
                    if (filterFrom == null) return true;
                    return overlaps(e, filterFrom, filterTo);
                })
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", e.getName());
                    m.put("startDate", e.getStartDate().toString());
                    m.put("endDate", e.getEndDate().toString());
                    m.put("impactLevel", e.getImpactLevel().name());
                    m.put("impactPercent", "+" + switch (e.getImpactLevel()) {
                        case FAIBLE -> impactConfig.getFaiblePercent();
                        case MOYEN -> impactConfig.getMoyenPercent();
                        case FORT -> impactConfig.getFortPercent();
                        case EXCEPTIONNEL -> impactConfig.getExceptionnelPercent();
                    } + "%");
                    m.put("recurring", e.isRecurring());
                    m.put("zone", e.getZoneId() != null ? zoneNames.getOrDefault(e.getZoneId(), "Zone " + e.getZoneId()) : "Tous logements");
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> response = new LinkedHashMap<>();
        if (filterFrom != null) {
            response.put("from", filterFrom.toString());
            response.put("to", filterTo.toString());
        }
        response.put("count", result.size());
        response.put("events", result);
        return response;
    }

    private boolean overlaps(LocalEvent e, LocalDate from, LocalDate to) {
        if (e.isRecurring()) {
            int evtS = e.getStartDate().getMonthValue() * 100 + e.getStartDate().getDayOfMonth();
            int evtE = e.getEndDate().getMonthValue()   * 100 + e.getEndDate().getDayOfMonth();
            int anaS = from.getMonthValue() * 100 + from.getDayOfMonth();
            int anaE = to.getMonthValue()   * 100 + to.getDayOfMonth();
            return !(evtE < anaS || evtS > anaE);
        }
        return !e.getEndDate().isBefore(from) && !e.getStartDate().isAfter(to);
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

        Long roomId;
        try {
            roomId = roomIdResolver.resolveRoomId(userId, token, propId, from.toString(), to.toString());
        } catch (IllegalArgumentException e) {
            return Map.of("error", "Chambre introuvable pour ce logement.");
        }

        beds24.updateCalendar(token, List.of(Map.of(
                "roomId", roomId,
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

    // ─── Suggestions FAQ & feedbacks actions ────────────────────────────────

    private Map<String, Object> reportUnhandledAction(Long userId, String lang, String action, String userMessage) {
        if (action == null || action.isBlank()) {
            return Map.of("error", "Description de l'action manquante.");
        }
        com.flowlyrent.model.AppUser user = securityUtils.getCurrentUser();
        StringBuilder msg = new StringBuilder(action.trim());
        if (userMessage != null && !userMessage.isBlank()) {
            msg.append("\n\n").append(userMessage.trim());
        }
        Feedback fb = new Feedback();
        fb.setUserId(userId);
        fb.setUserEmail(user.getEmail());
        fb.setCategory("chatbot");
        fb.setMessage(msg.toString());
        feedbackRepo.save(fb);
        return Map.of("success", true);
    }

    private Map<String, Object> suggestFaq(Long userId, String lang, String question, String answer) {
        if (question == null || question.isBlank()) {
            return Map.of("error", "Question vide.");
        }
        FaqSuggestion suggestion = new FaqSuggestion();
        suggestion.setQuestion(question.trim());
        suggestion.setAnswer(answer != null && !answer.isBlank() ? answer.trim() : null);
        suggestion.setLang(lang != null && !lang.isBlank() ? lang : "fr");
        suggestion.setUserId(userId);
        faqSuggestionRepo.save(suggestion);
        return Map.of("success", true);
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

    private Object nonNull(Map<String, Object> b, String... keys) {
        for (String k : keys) {
            Object v = b.get(k);
            if (v != null && !v.toString().isBlank()) return v;
        }
        return null;
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
