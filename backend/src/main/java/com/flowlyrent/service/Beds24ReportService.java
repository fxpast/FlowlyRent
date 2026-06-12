package com.flowlyrent.service;

import com.flowlyrent.dto.ReportResult;
import com.flowlyrent.model.Beds24Account;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Rapports financiers basés sur l'API Beds24 (aucun stockage local).
 * Toutes les données sont récupérées en direct et calculées en mémoire.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class Beds24ReportService {

    private final Beds24ApiClient beds24;

    // --- B24_CA_ANNUAL : chiffre d'affaires mensuel sur une année ---

    @SuppressWarnings("unchecked")
    public ReportResult caAnnual(Beds24Account account, int year) throws Exception {
        String token = beds24.tokenFor(account);
        List<Map<String, Object>> bookings = fetchBookingsForYear(token, year);

        Map<Integer, BigDecimal> caByMonth = new TreeMap<>();
        Map<Integer, Long> countByMonth = new TreeMap<>();
        for (int m = 1; m <= 12; m++) {
            caByMonth.put(m, BigDecimal.ZERO);
            countByMonth.put(m, 0L);
        }

        BigDecimal totalCa = BigDecimal.ZERO;
        for (Map<String, Object> b : bookings) {
            String arrival = str(b, "arrival");
            if (arrival == null || arrival.length() < 7) continue;
            int month = Integer.parseInt(arrival.substring(5, 7));
            BigDecimal price = decimal(b, "totalPrice");
            if (price == null) price = decimal(b, "price");
            if (price == null) continue;
            caByMonth.merge(month, price, BigDecimal::add);
            countByMonth.merge(month, 1L, Long::sum);
            totalCa = totalCa.add(price);
        }

        List<List<Object>> rows = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            String moisLabel = Month.of(m).getDisplayName(TextStyle.FULL, Locale.FRENCH);
            rows.add(List.of(moisLabel, countByMonth.get(m), caByMonth.get(m).setScale(2, RoundingMode.HALF_UP)));
        }

        return ReportResult.builder()
                .type("B24_CA_ANNUAL")
                .title("CA mensuel " + year)
                .params(Map.of("year", String.valueOf(year)))
                .headers(List.of("Mois", "Réservations", "CA (€)"))
                .rows(rows)
                .summary(Map.of(
                        "totalReservations", bookings.size(),
                        "caTotal", totalCa.setScale(2, RoundingMode.HALF_UP)
                ))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // --- B24_CA_ANNUAL_PROPERTY : CA annuel par propriété ---

    public ReportResult caAnnualByProperty(Beds24Account account, int year) throws Exception {
        String token = beds24.tokenFor(account);
        List<Map<String, Object>> bookings = fetchBookingsForYear(token, year);
        List<Map<String, Object>> properties = beds24.getProperties(token, Map.of());

        Map<String, String> propNames = new HashMap<>();
        for (Map<String, Object> p : properties) {
            String id = str(p, "id");
            String name = str(p, "name");
            if (id != null) propNames.put(id, name != null ? name : id);
        }

        Map<String, BigDecimal> caByProp = new TreeMap<>();
        Map<String, Long> countByProp = new TreeMap<>();

        for (Map<String, Object> b : bookings) {
            String propId = str(b, "propId");
            if (propId == null) continue;
            BigDecimal price = decimal(b, "totalPrice");
            if (price == null) price = decimal(b, "price");
            if (price == null) continue;
            String label = propNames.getOrDefault(propId, propId);
            caByProp.merge(label, price, BigDecimal::add);
            countByProp.merge(label, 1L, Long::sum);
        }

        List<List<Object>> rows = caByProp.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(e -> List.<Object>of(
                        e.getKey(),
                        countByProp.getOrDefault(e.getKey(), 0L),
                        e.getValue().setScale(2, RoundingMode.HALF_UP)
                ))
                .collect(Collectors.toList());

        BigDecimal total = caByProp.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        return ReportResult.builder()
                .type("B24_CA_ANNUAL_PROPERTY")
                .title("CA par propriété — " + year)
                .params(Map.of("year", String.valueOf(year)))
                .headers(List.of("Propriété", "Réservations", "CA (€)"))
                .rows(rows)
                .summary(Map.of(
                        "totalReservations", bookings.size(),
                        "caTotal", total.setScale(2, RoundingMode.HALF_UP)
                ))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // --- B24_CA_PROPERTY : CA mensuel d'une propriété sur une période ---

    public ReportResult caByProperty(Beds24Account account, String propId, LocalDate from, LocalDate to) throws Exception {
        String token = beds24.tokenFor(account);
        Map<String, String> params = new HashMap<>();
        params.put("arrivalFrom", from.toString());
        params.put("arrivalTo", to.toString());
        params.put("propId", propId);
        params.put("status", "confirmed");
        List<Map<String, Object>> bookings = beds24.getBookings(token, params);

        List<List<Object>> rows = bookings.stream().map(b -> {
            BigDecimal price = decimal(b, "totalPrice");
            if (price == null) price = decimal(b, "price");
            return List.<Object>of(
                    str(b, "arrival"),
                    str(b, "departure"),
                    str(b, "guestFirstName") + " " + str(b, "guestLastName"),
                    str(b, "channel"),
                    price != null ? price.setScale(2, RoundingMode.HALF_UP) : "—"
            );
        }).collect(Collectors.toList());

        BigDecimal total = bookings.stream()
                .map(b -> {
                    BigDecimal p = decimal(b, "totalPrice");
                    return p != null ? p : decimal(b, "price");
                })
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ReportResult.builder()
                .type("B24_CA_PROPERTY")
                .title("CA propriété " + propId + " (" + from + " → " + to + ")")
                .params(Map.of("propId", propId, "from", from.toString(), "to", to.toString()))
                .headers(List.of("Arrivée", "Départ", "Voyageur", "Canal", "Prix (€)"))
                .rows(rows)
                .summary(Map.of(
                        "totalReservations", bookings.size(),
                        "caTotal", total.setScale(2, RoundingMode.HALF_UP)
                ))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // --- B24_STATS_PLATFORM : stats par plateforme (Airbnb, Booking, Direct…) ---

    public ReportResult statsByPlatform(Beds24Account account, LocalDate from, LocalDate to) throws Exception {
        String token = beds24.tokenFor(account);
        Map<String, String> params = new HashMap<>();
        params.put("arrivalFrom", from.toString());
        params.put("arrivalTo", to.toString());
        params.put("status", "confirmed");
        List<Map<String, Object>> bookings = beds24.getBookings(token, params);

        Map<String, Long> countByChannel = new TreeMap<>();
        Map<String, BigDecimal> caByChannel = new TreeMap<>();

        for (Map<String, Object> b : bookings) {
            String channel = str(b, "channel");
            if (channel == null) channel = "Direct";
            BigDecimal price = decimal(b, "totalPrice");
            if (price == null) price = decimal(b, "price");
            if (price == null) price = BigDecimal.ZERO;
            countByChannel.merge(channel, 1L, Long::sum);
            caByChannel.merge(channel, price, BigDecimal::add);
        }

        List<List<Object>> rows = countByChannel.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> {
                    BigDecimal ca = caByChannel.getOrDefault(e.getKey(), BigDecimal.ZERO);
                    double pct = bookings.isEmpty() ? 0 : (e.getValue() * 100.0 / bookings.size());
                    return List.<Object>of(
                            e.getKey(),
                            e.getValue(),
                            String.format("%.1f%%", pct),
                            ca.setScale(2, RoundingMode.HALF_UP)
                    );
                })
                .collect(Collectors.toList());

        BigDecimal totalCa = caByChannel.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        return ReportResult.builder()
                .type("B24_STATS_PLATFORM")
                .title("Stats par plateforme (" + from + " → " + to + ")")
                .params(Map.of("from", from.toString(), "to", to.toString()))
                .headers(List.of("Canal", "Réservations", "Part (%)", "CA (€)"))
                .rows(rows)
                .summary(Map.of(
                        "totalReservations", bookings.size(),
                        "caTotal", totalCa.setScale(2, RoundingMode.HALF_UP)
                ))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // --- B24_OCCUPANCY : taux d'occupation par propriété ---

    public ReportResult occupancy(Beds24Account account, LocalDate from, LocalDate to) throws Exception {
        String token = beds24.tokenFor(account);
        List<Map<String, Object>> properties = beds24.getProperties(token, Map.of());

        Map<String, String> params = new HashMap<>();
        params.put("arrivalFrom", from.toString());
        params.put("arrivalTo", to.toString());
        params.put("status", "confirmed");
        List<Map<String, Object>> bookings = beds24.getBookings(token, params);

        long totalDays = from.until(to).getDays() + 1;

        Map<String, Long> nightsByProp = new HashMap<>();
        for (Map<String, Object> b : bookings) {
            String propId = str(b, "propId");
            if (propId == null) continue;
            String arrival = str(b, "arrival");
            String departure = str(b, "departure");
            if (arrival == null || departure == null) continue;
            try {
                LocalDate a = LocalDate.parse(arrival);
                LocalDate d = LocalDate.parse(departure);
                long nights = a.until(d).getDays();
                nightsByProp.merge(propId, nights, Long::sum);
            } catch (Exception ignored) {}
        }

        Map<String, String> propNames = new HashMap<>();
        for (Map<String, Object> p : properties) {
            String id = str(p, "id");
            String name = str(p, "name");
            if (id != null) propNames.put(id, name != null ? name : id);
        }

        List<List<Object>> rows = propNames.entrySet().stream()
                .sorted(Map.Entry.comparingByValue())
                .map(e -> {
                    long nights = nightsByProp.getOrDefault(e.getKey(), 0L);
                    double occ = totalDays > 0 ? (nights * 100.0 / totalDays) : 0;
                    return List.<Object>of(
                            e.getValue(),
                            nights,
                            totalDays,
                            String.format("%.1f%%", occ)
                    );
                })
                .collect(Collectors.toList());

        return ReportResult.builder()
                .type("B24_OCCUPANCY")
                .title("Taux d'occupation (" + from + " → " + to + ")")
                .params(Map.of("from", from.toString(), "to", to.toString()))
                .headers(List.of("Propriété", "Nuits réservées", "Nuits totales", "Taux (%)"))
                .rows(rows)
                .summary(Map.of("periodeDays", totalDays))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // --- CA_MENSUEL : chiffre d'affaires d'un mois avec ventilation au prorata ---
    // Algorithme : itération jour par jour (ref. CA_mois PHP).
    // Une réservation à cheval sur deux mois contribue price/nights par jour effectif dans le mois.

    public Map<String, Object> caMonthly(Beds24Account account, int year, int month) throws Exception {
        String token = beds24.tokenFor(account);

        LocalDate firstDay = LocalDate.of(year, month, 1);
        LocalDate lastDay  = firstDay.withDayOfMonth(firstDay.lengthOfMonth());

        // Toutes les réservations qui chevauchent le mois :
        // arrivée ≤ dernier jour du mois  ET  départ ≥ premier jour du mois
        // On ne filtre pas status côté API (le filtre Beds24 v2 est sensible à la casse et peu fiable)
        // → on filtre en Java : New + Confirmed (comme PHP : status IN ('New','Confirmed'))
        Map<String, String> params = new HashMap<>();
        params.put("arrivalTo",     lastDay.toString());
        params.put("departureFrom", firstDay.toString());
        List<Map<String, Object>> allBookings = beds24.getBookings(token, params);
        log.info("[caMonthly] {}-{} : {} réservations brutes récupérées", year, month, allBookings.size());
        if (!allBookings.isEmpty()) {
            Map<String, Object> sample = allBookings.get(0);
            log.info("[caMonthly] Champs disponibles : {}", sample.keySet());
            log.info("[caMonthly] Exemple réservation : status={} arrival={} departure={} price={} totalPrice={}",
                    sample.get("status"), sample.get("arrival"), sample.get("departure"),
                    sample.get("price"), sample.get("totalPrice"));
        }
        List<Map<String, Object>> bookings = allBookings.stream()
                .filter(b -> {
                    String s = str(b, "status");
                    if (s == null) return false;
                    String sl = s.toLowerCase();
                    return sl.equals("confirmed") || sl.equals("new");
                })
                .collect(Collectors.toList());
        log.info("[caMonthly] {}-{} : {} réservations après filtre New/Confirmed", year, month, bookings.size());

        // Noms des propriétés
        List<Map<String, Object>> properties = beds24.getProperties(token, Map.of());
        Map<String, String> propNames = new HashMap<>();
        for (Map<String, Object> p : properties) {
            String id   = str(p, "id");
            String name = str(p, "name");
            if (id != null) propNames.put(id, name != null ? name : id);
        }

        // Pré-décodage des réservations
        record BookingData(LocalDate arrival, LocalDate departure, String propName, BigDecimal pricePerNight) {}
        List<BookingData> decoded = new ArrayList<>();
        for (Map<String, Object> b : bookings) {
            String arrStr = str(b, "arrival");
            String depStr = str(b, "departure");
            if (arrStr == null || depStr == null || arrStr.length() < 10 || depStr.length() < 10) continue;
            LocalDate arrival   = LocalDate.parse(arrStr.substring(0, 10));
            LocalDate departure = LocalDate.parse(depStr.substring(0, 10));
            long nights = ChronoUnit.DAYS.between(arrival, departure);
            if (nights <= 0) continue;
            BigDecimal price = decimal(b, "totalPrice");
            if (price == null) price = decimal(b, "price");
            if (price == null) continue;
            String propId   = str(b, "propId");
            String propName = propId != null ? propNames.getOrDefault(propId, propId) : "Inconnu";
            BigDecimal ppn  = price.divide(BigDecimal.valueOf(nights), 4, RoundingMode.HALF_UP);
            decoded.add(new BookingData(arrival, departure, propName, ppn));
        }

        // Itération jour par jour (algorithme CA_mois)
        Map<String, BigDecimal> caByProp     = new LinkedHashMap<>();
        Map<String, Integer>    nightsByProp = new LinkedHashMap<>();
        BigDecimal caTotal   = BigDecimal.ZERO;
        int        totalNights = 0;

        for (LocalDate day = firstDay; !day.isAfter(lastDay); day = day.plusDays(1)) {
            for (BookingData bd : decoded) {
                // Le jour est couvert si : arrival <= day < departure
                if (!day.isBefore(bd.arrival()) && day.isBefore(bd.departure())) {
                    caByProp.merge(bd.propName(),    bd.pricePerNight(), BigDecimal::add);
                    nightsByProp.merge(bd.propName(), 1,                 Integer::sum);
                    caTotal = caTotal.add(bd.pricePerNight());
                    totalNights++;
                }
            }
        }

        // Construction de la réponse
        List<Map<String, Object>> byProperty = caByProp.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("propertyName", e.getKey());
                    row.put("ca",     e.getValue().setScale(2, RoundingMode.HALF_UP));
                    row.put("nights", nightsByProp.getOrDefault(e.getKey(), 0));
                    return row;
                })
                .collect(Collectors.toList());

        int daysInMonth = lastDay.getDayOfMonth();
        int nbProps      = Math.max(propNames.size(), 1);
        BigDecimal occRate = daysInMonth > 0
                ? BigDecimal.valueOf(100.0 * totalNights / ((long) daysInMonth * nbProps))
                      .setScale(1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("year",         year);
        result.put("month",        month);
        result.put("monthLabel",   Month.of(month).getDisplayName(TextStyle.FULL, Locale.FRENCH));
        result.put("caTotal",      caTotal.setScale(2, RoundingMode.HALF_UP));
        result.put("nights",       totalNights);
        result.put("daysInMonth",  daysInMonth);
        result.put("occupancyRate", occRate);
        result.put("byProperty",   byProperty);
        return result;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private List<Map<String, Object>> fetchBookingsForYear(String token, int year) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("arrivalFrom", year + "-01-01");
        params.put("arrivalTo", year + "-12-31");
        params.put("status", "confirmed");
        return beds24.getBookings(token, params);
    }

    private String str(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : null;
    }

    private BigDecimal decimal(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return null;
        try {
            return new BigDecimal(val.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
