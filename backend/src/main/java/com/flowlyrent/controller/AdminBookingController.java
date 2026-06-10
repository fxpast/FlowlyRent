package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.PropertyConfigRepository;
import com.flowlyrent.service.Beds24ApiClient;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/bookings")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Réservations admin")
public class AdminBookingController {

    private final Beds24ApiClient beds24;
    private final Beds24AccountRepository accountRepo;
    private final PropertyConfigRepository propConfigRepo;
    private final SecurityUtils securityUtils;

    @GetMapping("/estimate")
    public ResponseEntity<?> estimate(@RequestParam String propId,
                                       @RequestParam String arrival,
                                       @RequestParam String departure,
                                       @RequestParam(defaultValue = "1") int numAdult) {
        try {
            Beds24Account account = requireAccount();
            String token = beds24.tokenFor(account);

            LocalDate arrDate = LocalDate.parse(arrival.substring(0, 10));
            LocalDate depDate = LocalDate.parse(departure.substring(0, 10));
            long nights = java.time.temporal.ChronoUnit.DAYS.between(arrDate, depDate);
            if (nights <= 0) return ResponseEntity.badRequest().body(Map.of("error", "Dates invalides"));

            PropertyConfig cfg = propConfigRepo
                    .findByUserIdAndBeds24PropertyId(securityUtils.getCurrentUserId(), propId)
                    .orElse(null);

            Map<String, String> calParams = new HashMap<>();
            calParams.put("startDate",      arrDate.toString());
            calParams.put("endDate",        depDate.toString());
            calParams.put("includePrices",  "1");
            calParams.put("includeMinStay", "1");
            List<Map<String, Object>> rooms = beds24.getCalendar(token, calParams);

            String pId = idStr(propId);
            log.info("[estimate] propId={} numAdult={} rooms={}", pId, numAdult, rooms.size());

            double nightsPrice = 0.0;
            for (Map<String, Object> room : rooms) {
                if (!pId.equals(idStr(room.get("propertyId")))) continue;
                Object calObj = room.get("calendar");
                if (!(calObj instanceof List)) continue;
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> cal = (List<Map<String, Object>>) calObj;
                for (Map<String, Object> entry : cal) {
                    Object p = entry.get("price1");
                    if (p == null) continue;
                    double price;
                    try { price = Double.parseDouble(p.toString()); } catch (Exception ignored) { continue; }
                    long n;
                    try {
                        LocalDate from = LocalDate.parse(entry.get("from").toString().substring(0, 10));
                        LocalDate to   = LocalDate.parse(entry.get("to").toString().substring(0, 10));
                        LocalDate eff_from = from.isBefore(arrDate) ? arrDate : from;
                        LocalDate eff_to   = to.isAfter(depDate)   ? depDate : to;
                        n = java.time.temporal.ChronoUnit.DAYS.between(eff_from, eff_to);
                    } catch (Exception ignored) { n = 1; }
                    if (n <= 0) continue;
                    nightsPrice += price * n;

                    // Frais supplémentaire par personne si dépassement du seuil
                    if (cfg != null && cfg.getExtraPersonThreshold() != null && cfg.getExtraPersonFee() != null) {
                        int extra = numAdult - cfg.getExtraPersonThreshold();
                        if (extra > 0) nightsPrice += extra * cfg.getExtraPersonFee() * n;
                    }
                }
            }

            // Réductions long séjour
            if (nights >= 28 && cfg != null && cfg.getDiscount28Nights() != null && cfg.getDiscount28Nights() > 0) {
                nightsPrice = nightsPrice * (100.0 - cfg.getDiscount28Nights()) / 100.0;
            } else if (nights >= 7 && cfg != null && cfg.getDiscount7Nights() != null && cfg.getDiscount7Nights() > 0) {
                nightsPrice = nightsPrice * (100.0 - cfg.getDiscount7Nights()) / 100.0;
            }

            log.info("[estimate] nights={} nightsPrice={}", nights, nightsPrice);

            double taxeSejour = Math.round(nightsPrice * 0.0275 * 100.0) / 100.0;
            double cleaningFee = cfg != null && cfg.getCleaningFee() != null ? cfg.getCleaningFee() : 0.0;

            Map<String, Object> result = new HashMap<>();
            result.put("nights",      nights);
            result.put("nightsPrice", Math.round(nightsPrice * 100.0) / 100.0);
            result.put("taxeSejour",  taxeSejour);
            result.put("cleaningFee", Math.round(cleaningFee * 100.0) / 100.0);
            return ResponseEntity.ok(result);
        } catch (Exception e) { return error(e); }
    }

    @GetMapping("/debug-fields")
    public ResponseEntity<?> debugFields() {
        try {
            Beds24Account account = requireAccount();
            String token = beds24.tokenFor(account);
            List<Map<String, Object>> bookings = beds24.getBookings(token,
                    Map.of("arrivalFrom", LocalDate.now().minusDays(60).toString(),
                           "arrivalTo",   LocalDate.now().plusDays(60).toString()));
            if (bookings.isEmpty()) return ResponseEntity.ok(Map.of("count", 0, "note", "Aucune réservation trouvée"));
            Map<String, Object> first = bookings.get(0);
            log.info("[DEBUG] keys={} | sample={}", first.keySet(), first);
            return ResponseEntity.ok(Map.of("count", bookings.size(), "keys", first.keySet(), "first", first));
        } catch (Exception e) { return error(e); }
    }

    @GetMapping("/overlap")
    public ResponseEntity<?> checkOverlap(
            @RequestParam String propId,
            @RequestParam String arrival,
            @RequestParam String departure,
            @RequestParam(defaultValue = "") String excludeId) {
        try {
            Beds24Account account = requireAccount();
            String token = beds24.tokenFor(account);

            LocalDate arrDate = LocalDate.parse(arrival.substring(0, 10));
            String arr = arrival.substring(0, 10);
            String dep = departure.substring(0, 10);

            Map<String, String> params = new HashMap<>();
            params.put("arrivalFrom", arrDate.minusDays(60).toString());
            params.put("arrivalTo",   dep);
            List<Map<String, Object>> bookings = beds24.getBookings(token, params);

            String pid = idStr(propId);
            List<Map<String, Object>> conflicts = bookings.stream()
                .filter(b -> {
                    String status = Objects.toString(b.get("status"), "").toLowerCase();
                    if (!status.equals("new") && !status.equals("confirmed")) return false;
                    Object bPid = b.get("propId") != null ? b.get("propId") : b.get("propertyId");
                    if (!Objects.equals(pid, idStr(bPid))) return false;
                    if (!excludeId.isEmpty() && excludeId.equals(idStr(b.get("id")))) return false;
                    String bArr = truncateDate(Objects.toString(b.get("arrival"), ""));
                    String bDep = truncateDate(Objects.toString(b.get("departure"), ""));
                    return !bArr.isEmpty() && !bDep.isEmpty()
                        && bArr.compareTo(dep) < 0
                        && bDep.compareTo(arr) > 0;
                })
                .map(b -> {
                    String first = Objects.toString(b.get("guestFirstName") != null ? b.get("guestFirstName") : b.get("firstName"), "");
                    String last  = Objects.toString(b.get("guestLastName")  != null ? b.get("guestLastName")  : b.get("lastName"),  "");
                    String guest = (first + " " + last).trim();
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",        idStr(b.get("id")));
                    m.put("guestName", guest.isEmpty() ? "Voyageur" : guest);
                    m.put("arrival",   truncateDate(Objects.toString(b.get("arrival"), "")));
                    m.put("departure", truncateDate(Objects.toString(b.get("departure"), "")));
                    return m;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(conflicts);
        } catch (Exception e) { return error(e); }
    }

    private String truncateDate(String date) {
        if (date == null || date.length() < 10) return date == null ? "" : date;
        return date.substring(0, 10);
    }

    @GetMapping
    public ResponseEntity<?> getBookings(@RequestParam Map<String, String> params) {
        try {
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.getBookingsAllStatuses(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBooking(@PathVariable Long id) {
        try {
            Beds24Account account = requireAccount();
            List<Map<String, Object>> list = beds24.getBookings(beds24.tokenFor(account), Map.of("id", id.toString()));
            return list.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(list.get(0));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/today")
    public ResponseEntity<?> getToday(@RequestParam(required = false) String date) {
        try {
            Beds24Account account = requireAccount();
            String token = beds24.tokenFor(account);
            LocalDate localToday = (date != null && !date.isBlank()) ? LocalDate.parse(date) : LocalDate.now();
            String today     = localToday.toString();
            String yesterday = localToday.minusDays(1).toString();
            String pastLimit = localToday.minusDays(90).toString();

            // Départs du jour
            List<Map<String, Object>> departures = beds24.getBookings(token,
                    Map.of("departureFrom", today, "departureTo", today));

            // Arrivées du jour
            List<Map<String, Object>> arrivals = beds24.getBookings(token,
                    Map.of("arrivalFrom", today, "arrivalTo", today));

            // En cours : arrivés avant aujourd'hui, pas encore repartis
            List<Map<String, Object>> recentPast = beds24.getBookings(token,
                    Map.of("arrivalFrom", pastLimit, "arrivalTo", yesterday));
            List<Map<String, Object>> ongoing = recentPast.stream()
                    .filter(b -> {
                        String dep    = truncateDate(Objects.toString(b.get("departure"), ""));
                        String status = Objects.toString(b.get("status"), "").toLowerCase();
                        return dep.compareTo(today) > 0
                            && (status.equals("new") || status.equals("confirmed"));
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "departures", departures,
                    "arrivals",   arrivals,
                    "ongoing",    ongoing
            ));
        } catch (Exception e) { return error(e); }
    }

    @GetMapping("/arrivals")
    public ResponseEntity<?> getArrivals(@RequestParam(defaultValue = "") String weekStart) {
        try {
            LocalDate start = weekStart.isBlank() ? LocalDate.now() : LocalDate.parse(weekStart);
            Map<String, String> params = Map.of(
                    "arrivalFrom", start.toString(),
                    "arrivalTo", start.plusDays(6).toString()
            );
            Beds24Account account = requireAccount();
            List<Map<String, Object>> bookings = beds24.getBookings(beds24.tokenFor(account), params);
            if (!bookings.isEmpty()) {
                log.info("[DEBUG] Beds24 booking fields: {}", bookings.get(0).keySet());
                log.info("[DEBUG] First booking sample: {}", bookings.get(0));
            }
            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/departures")
    public ResponseEntity<?> getDepartures(@RequestParam(defaultValue = "") String weekStart) {
        try {
            LocalDate start = weekStart.isBlank() ? LocalDate.now() : LocalDate.parse(weekStart);
            Map<String, String> params = Map.of(
                    "departureFrom", start.toString(),
                    "departureTo", start.plusDays(6).toString()
            );
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.getBookings(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PostMapping
    public ResponseEntity<?> saveBookings(@RequestBody List<Map<String, Object>> payload) {
        try {
            Beds24Account account = requireAccount();
            String token = beds24.tokenFor(account);

            List<Map<String, Object>> processed = new ArrayList<>();
            for (Map<String, Object> booking : payload) {
                Map<String, Object> b = new HashMap<>(booking);

                // Mapping noms de champs Angular → Beds24
                mapField(b, "guestFirstName", "firstName");
                mapField(b, "guestLastName",  "lastName");
                mapField(b, "guestEmail",     "email");
                mapField(b, "guestPhone",     "phone");
                mapField(b, "guestCountry",   "country");
                mapField(b, "totalPrice",     "price");

                boolean isCreate = b.get("id") == null;

                if (isCreate) {
                    // Valeurs par défaut pour une nouvelle réservation
                    b.putIfAbsent("status",   "confirmed");
                    b.putIfAbsent("lang",     "fr");
                    b.putIfAbsent("country",  "France");
                    b.putIfAbsent("numChild", 0);
                    b.putIfAbsent("mobile",   0);
                    b.putIfAbsent("lastName", "");
                    b.putIfAbsent("email",    "");

                    // Résolution roomId depuis propId / propertyId
                    if (b.get("roomId") == null) {
                        String propId = idStr(b.get("propId") != null ? b.get("propId") : b.get("propertyId"));
                        if (propId == null) throw new IllegalArgumentException("propId manquant");
                        String arrival = Objects.toString(b.get("arrival"), LocalDate.now().toString()).substring(0, 10);
                        Map<String, String> calParams = new HashMap<>();
                        calParams.put("startDate", arrival);
                        calParams.put("endDate",   arrival);
                        List<Map<String, Object>> rooms = beds24.getCalendar(token, calParams);
                        String roomId = rooms.stream()
                                .filter(r -> propId.equals(idStr(r.get("propertyId"))))
                                .map(r -> idStr(r.get("roomId")))
                                .findFirst()
                                .orElseThrow(() -> new IllegalArgumentException("Chambre non trouvée pour propriété " + propId));
                        b.put("roomId", Long.parseLong(roomId));
                    }
                }

                // Supprime les champs Angular inconnus de Beds24
                for (String f : List.of("propId", "propertyId", "propName", "propCity",
                                         "guestName", "guestFirstName", "guestLastName",
                                         "guestEmail", "guestPhone", "guestCountry", "totalPrice",
                                         "fraisMenage", "taxeSejour")) {
                    b.remove(f);
                }

                processed.add(b);
            }

            log.info("[Bookings] Payload envoyé à Beds24: {}", processed);
            return ResponseEntity.ok(beds24.saveBookings(token, processed));
        } catch (Exception e) {
            return error(e);
        }
    }

    private void mapField(Map<String, Object> b, String from, String to) {
        if (b.containsKey(from) && !b.containsKey(to)) b.put(to, b.get(from));
    }

    private String idStr(Object v) {
        if (v == null) return null;
        String s = v.toString();
        if (s.contains(".")) { try { return String.valueOf((long) Double.parseDouble(s)); } catch (Exception ignored) {} }
        return s.isBlank() ? null : s;
    }

    @DeleteMapping
    public ResponseEntity<?> deleteBookings(@RequestParam List<Long> ids) {
        try {
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.deleteBookings(beds24.tokenFor(account), ids));
        } catch (Exception e) {
            return error(e);
        }
    }

    private Beds24Account requireAccount() {
        return accountRepo.findByAppUserId(securityUtils.getCurrentUserId())
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté. Allez dans Paramètres pour le connecter."));
    }

    private ResponseEntity<Map<String, String>> error(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
