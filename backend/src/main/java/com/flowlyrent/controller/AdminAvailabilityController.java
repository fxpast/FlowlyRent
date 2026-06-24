package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.IcalBooking;
import com.flowlyrent.model.LocalProperty;
import com.flowlyrent.model.enums.ChannelType;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.IcalBookingRepository;
import com.flowlyrent.repository.LocalPropertyRepository;
import com.flowlyrent.service.Beds24ApiClient;
import com.flowlyrent.service.RoomIdResolverService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/availability")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Disponibilités")
public class AdminAvailabilityController {

    private final Beds24ApiClient beds24;
    private final Beds24AccountRepository accountRepo;
    private final LocalPropertyRepository localPropertyRepo;
    private final IcalBookingRepository icalBookingRepo;
    private final SecurityUtils securityUtils;
    private final RoomIdResolverService roomIdResolver;

    @GetMapping("/calendar")
    public ResponseEntity<?> getCalendar(@RequestParam String from, @RequestParam String to) {
        try {
            AppUser user = securityUtils.getCurrentUser();
            if (user.getChannelType() == ChannelType.ICAL) {
                return getCalendarIcal(user.getId(), from, to);
            }
            Beds24Account account = requireAccount();
            String token = beds24.tokenFor(account);

            List<Map<String, Object>> rawProps = beds24.getProperties(token, Map.of());

            // arrivalFrom = début du mois - 60 jours pour couvrir les séjours longs démarrés avant le mois
            // (departureFrom n'est pas garanti par tous les comptes Beds24 v2)
            LocalDate fromDate = LocalDate.parse(from);
            Map<String, String> bookingParams = new HashMap<>();
            bookingParams.put("arrivalFrom", fromDate.minusDays(60).toString());
            bookingParams.put("arrivalTo",   to);
            List<Map<String, Object>> rawBookings = beds24.getBookings(token, bookingParams);
            log.info("[Calendar] {} props, {} raw bookings for {}/{}", rawProps.size(), rawBookings.size(), from, to);

            if (!rawProps.isEmpty())
                log.info("[Calendar] Property[0] keys={} id={} propId={}", rawProps.get(0).keySet(), rawProps.get(0).get("id"), rawProps.get(0).get("propId"));
            if (!rawBookings.isEmpty())
                log.info("[Calendar] Booking[0] keys={} propId={} arrival={} departure={}", rawBookings.get(0).keySet(), rawBookings.get(0).get("propId"), rawBookings.get(0).get("arrival"), rawBookings.get(0).get("departure"));

            Set<String> propIdSet = rawProps.stream()
                    .map(p -> idStr(p.get("id") != null ? p.get("id") : p.get("propId")))
                    .filter(Objects::nonNull).collect(Collectors.toSet());

            // Map propId → nom de propriété pour enrichir les réservations
            Map<String, String> propNames = rawProps.stream()
                    .filter(p -> idStr(p.get("id") != null ? p.get("id") : p.get("propId")) != null)
                    .collect(Collectors.toMap(
                            p -> idStr(p.get("id") != null ? p.get("id") : p.get("propId")),
                            p -> Objects.toString(p.get("name"), ""),
                            (a, b2) -> a
                    ));

            List<Map<String, Object>> properties = rawProps.stream().map(p -> {
                Object propId = p.get("id") != null ? p.get("id") : p.get("propId");
                Map<String, Object> m = new HashMap<>();
                m.put("id",   idStr(propId));
                m.put("name", Objects.toString(p.get("name"), ""));
                m.put("city", Objects.toString(p.get("city"), ""));
                return m;
            }).toList();

            List<Map<String, Object>> bookings = rawBookings.stream()
                    .filter(b -> {
                        Object pid = b.get("propId") != null ? b.get("propId") : b.get("propertyId");
                        if (!propIdSet.contains(idStr(pid))) return false;
                        String status = Objects.toString(b.get("status"), "").toLowerCase();
                        return status.equals("new") || status.equals("confirmed");
                    })
                    .map(b -> {
                        String first = Objects.toString(b.get("guestFirstName"), "");
                        String last  = Objects.toString(b.get("guestLastName"), "");
                        if (first.isBlank()) first = Objects.toString(b.get("firstName"), "");
                        if (last.isBlank())  last  = Objects.toString(b.get("lastName"),  "");
                        String guest = (first + " " + last).trim();
                        Object propId = b.get("propId") != null ? b.get("propId") : b.get("propertyId");
                        Object price  = b.get("totalPrice") != null ? b.get("totalPrice") : b.get("price");
                        Map<String, Object> m = new HashMap<>();
                        // Champs calendrier
                        m.put("id",             idStr(b.get("id")));
                        m.put("propertyId",     idStr(propId));
                        m.put("propId",         idStr(propId));
                        m.put("propName",       propNames.getOrDefault(idStr(propId), ""));
                        m.put("arrival",        truncateDate(Objects.toString(b.get("arrival"), "")));
                        m.put("departure",      truncateDate(Objects.toString(b.get("departure"), "")));
                        m.put("guestName",      guest.isEmpty() ? "Voyageur" : guest);
                        m.put("status",         Objects.toString(b.get("status"), ""));
                        m.put("channel",        normalizeChannel(Objects.toString(b.get("channel"), "")));
                        // Champs complets pour le dialog d'édition
                        m.put("guestFirstName", first);
                        m.put("guestLastName",  last);
                        m.put("guestEmail",     Objects.toString(b.get("guestEmail") != null ? b.get("guestEmail") : b.get("email"), ""));
                        m.put("guestPhone",     Objects.toString(b.get("guestPhone") != null ? b.get("guestPhone") : b.get("phone"), ""));
                        m.put("guestCountry",   Objects.toString(b.get("guestCountry"), ""));
                        m.put("numAdult",       b.get("numAdult"));
                        m.put("numChild",       b.get("numChild"));
                        m.put("totalPrice",     price);
                        m.put("notes",          Objects.toString(b.get("notes") != null ? b.get("notes") : b.get("internalNotes"), ""));
                        return m;
                    })
                    .filter(b -> !b.get("arrival").toString().isEmpty() && !b.get("departure").toString().isEmpty())
                    .toList();

            log.info("[Calendar] {} bookings after prop filter", bookings.size());

            // Fetch prix + durée min — logique identique au PHP createCalendar()
            // Structure : [{propertyId, roomId, calendar:[{from, to, price1, minStay, override}]}]
            Map<String, Map<String, Map<String, Object>>> calData = new HashMap<>();
            try {
                Map<String, String> calParams = new HashMap<>();
                calParams.put("startDate",       from);
                calParams.put("endDate",         to);
                calParams.put("includePrices",   "1");
                calParams.put("includeMinStay",  "1");
                calParams.put("includeOverride", "1");
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> rawRooms = beds24.getCalendar(token, calParams);
                log.info("[Calendar] {} rooms (startDate={} endDate={})", rawRooms.size(), from, to);
                if (!rawRooms.isEmpty()) log.info("[Calendar] room[0] keys={}", rawRooms.get(0).keySet());

                LocalDate rangeFrom = LocalDate.parse(from);
                LocalDate rangeTo   = LocalDate.parse(to);

                for (Map<String, Object> room : rawRooms) {
                    String pid = idStr(room.get("propertyId"));
                    if (pid == null) continue;
                    Object calObj = room.get("calendar");
                    if (!(calObj instanceof List<?> cal)) continue;

                    for (Object o : cal) {
                        if (!(o instanceof Map<?, ?> rawRange)) continue;
                        @SuppressWarnings("unchecked")
                        Map<String, Object> range = (Map<String, Object>) rawRange;

                        Object price1   = range.get("price1");
                        Object minStay  = range.get("minStay");
                        Object override = range.get("override");
                        boolean isBlackout = "blackout".equalsIgnoreCase(Objects.toString(override, ""));
                        // Skippe si price1 absent ET pas un blackout
                        if (price1 == null && !isBlackout) continue;

                        String fromStr = truncateDate(Objects.toString(range.get("from"), ""));
                        String toStr   = truncateDate(Objects.toString(range.get("to"),   ""));
                        if (fromStr.isEmpty() || toStr.isEmpty()) continue;

                        // Expansion jour par jour dans la fenêtre demandée
                        LocalDate cur = LocalDate.parse(fromStr);
                        LocalDate end = LocalDate.parse(toStr);
                        while (!cur.isAfter(end)) {
                            if (!cur.isBefore(rangeFrom) && !cur.isAfter(rangeTo)) {
                                String dateStr = cur.toString();
                                Map<String, Object> entry = new HashMap<>();
                                entry.put("price",    price1);
                                entry.put("minStay",  minStay);
                                entry.put("override", override);
                                calData.computeIfAbsent(pid, k -> new HashMap<>())
                                       .putIfAbsent(dateStr, entry);
                            }
                            cur = cur.plusDays(1);
                        }
                    }
                }
                log.info("[Calendar] calData {} propriétés", calData.size());
            } catch (Exception e) {
                log.warn("[Calendar] Impossible de charger les données calendrier: {}", e.getMessage(), e);
            }

            // Génère les blocs blackout depuis calData (override = "blackout")
            List<Map<String, Object>> blocks = new ArrayList<>();
            calData.forEach((pid, dates) -> {
                List<String> blackoutDates = dates.entrySet().stream()
                        .filter(e -> "blackout".equalsIgnoreCase(Objects.toString(e.getValue().get("override"), "")))
                        .map(Map.Entry::getKey)
                        .sorted()
                        .toList();
                if (blackoutDates.isEmpty()) return;

                // Regroupe les dates consécutives en plages
                String rangeStart = blackoutDates.get(0);
                String rangeEnd   = blackoutDates.get(0);
                for (int i = 1; i < blackoutDates.size(); i++) {
                    LocalDate prev = LocalDate.parse(blackoutDates.get(i - 1));
                    LocalDate curr = LocalDate.parse(blackoutDates.get(i));
                    if (curr.equals(prev.plusDays(1))) {
                        rangeEnd = blackoutDates.get(i);
                    } else {
                        Map<String, Object> b = new HashMap<>();
                        b.put("id",         pid + "-" + rangeStart);
                        b.put("propertyId", pid);
                        b.put("startDate",  rangeStart);
                        b.put("endDate",    rangeEnd);
                        b.put("type",       "BLACKOUT");
                        b.put("notes",      "");
                        blocks.add(b);
                        rangeStart = blackoutDates.get(i);
                        rangeEnd   = blackoutDates.get(i);
                    }
                }
                Map<String, Object> b = new HashMap<>();
                b.put("id",         pid + "-" + rangeStart);
                b.put("propertyId", pid);
                b.put("startDate",  rangeStart);
                b.put("endDate",    rangeEnd);
                b.put("type",       "BLACKOUT");
                b.put("notes",      "");
                blocks.add(b);
            });
            log.info("[Calendar] {} blackout blocks générés", blocks.size());

            Map<String, Object> result = new HashMap<>();
            result.put("properties",   properties);
            result.put("bookings",     bookings);
            result.put("blocks",       blocks);
            result.put("calendarData", calData);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return error(e);
        }
    }

    private String idStr(Object value) {
        if (value == null) return null;
        String s = value.toString();
        if (s.contains(".")) {
            try { return String.valueOf((long) Double.parseDouble(s)); } catch (Exception ignored) {}
        }
        return s.isBlank() ? null : s;
    }

    private String truncateDate(String date) {
        if (date == null || date.length() < 10) return date;
        return date.substring(0, 10);
    }

    private String normalizeChannel(String channel) {
        if (channel == null || channel.isBlank()) return "direct";
        String lc = channel.toLowerCase();
        if (lc.contains("airbnb"))                                    return "airbnb";
        if (lc.contains("booking"))                                   return "booking";
        if (lc.contains("abritel") || lc.contains("vrbo") || lc.contains("homeaway")) return "abritel";
        if (lc.contains("direct"))                                    return "direct";
        return lc;
    }

    @GetMapping("/calendar-debug")
    public ResponseEntity<?> debugCalendar(@RequestParam(defaultValue = "") String from,
                                           @RequestParam(defaultValue = "") String to) {
        try {
            Beds24Account account = requireAccount();
            String token = beds24.tokenFor(account);
            String f = from.isBlank() ? LocalDate.now().toString() : from;
            String t = to.isBlank()   ? LocalDate.now().plusDays(7).toString() : to;
            Map<String, String> p = new HashMap<>();
            p.put("startDate",     f);
            p.put("endDate",       t);
            p.put("includePrices",  "true");
            p.put("includeMinStay", "true");
            List<Map<String, Object>> raw = beds24.getCalendar(token, p);
            log.info("[CalDebug] {} rooms", raw.size());
            if (!raw.isEmpty()) log.info("[CalDebug] room[0]={}", raw.get(0));
            return ResponseEntity.ok(Map.of("count", raw.size(), "raw", raw.isEmpty() ? List.of() : raw.subList(0, Math.min(2, raw.size()))));
        } catch (Exception e) { return error(e); }
    }

    @PostMapping("/calendar")
    public ResponseEntity<?> updateCalendar(@RequestBody List<Map<String, Object>> payload) {
        try {
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.updateCalendar(beds24.tokenFor(account), payload));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PostMapping("/blackout")
    public ResponseEntity<?> setBlackout(@RequestParam String propertyId,
                                          @RequestParam String from,
                                          @RequestParam String to,
                                          @RequestParam(defaultValue = "none") String override) {
        try {
            Beds24Account account = requireAccount();
            String token = beds24.tokenFor(account);
            Long roomId = roomIdResolver.resolveRoomId(securityUtils.getCurrentUserId(), token, propertyId, from, to);
            beds24.updateCalendar(token, List.of(Map.of(
                    "roomId",   roomId,
                    "calendar", List.of(Map.of("from", from, "to", to, "override", override))
            )));
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PostMapping("/price")
    public ResponseEntity<?> setPrice(@RequestParam String propertyId,
                                       @RequestParam String from,
                                       @RequestParam String to,
                                       @RequestParam(required = false) Double price,
                                       @RequestParam(required = false) Integer minStay) {
        try {
            Beds24Account account = requireAccount();
            String token = beds24.tokenFor(account);
            Long roomId = roomIdResolver.resolveRoomId(securityUtils.getCurrentUserId(), token, propertyId, from, to);
            Map<String, Object> calEntry = new HashMap<>();
            calEntry.put("from", from);
            calEntry.put("to",   to);
            if (price   != null) calEntry.put("price1",  price);
            if (minStay != null) calEntry.put("minStay", minStay);
            beds24.updateCalendar(token, List.of(Map.of(
                    "roomId",   roomId,
                    "calendar", List.of(calEntry)
            )));
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/availability")
    public ResponseEntity<?> getAvailability(@RequestParam Map<String, String> params) {
        try {
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.getAvailability(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return error(e);
        }
    }

    private ResponseEntity<?> getCalendarIcal(Long userId, String from, String to) {
        List<LocalProperty> props = localPropertyRepo.findByUserIdOrderByCreatedAtAsc(userId);

        List<Map<String, Object>> properties = props.stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id",   p.getId().toString());
            m.put("name", p.getShortName() != null && !p.getShortName().isBlank() ? p.getShortName() : p.getName());
            m.put("city", "");
            return m;
        }).toList();

        LocalDate fromDate = LocalDate.parse(from).minusDays(60);
        List<IcalBooking> rawBookings = icalBookingRepo.findByUserIdAndArrivalBetween(userId, fromDate, LocalDate.parse(to).plusDays(1));

        List<Map<String, Object>> bookings = rawBookings.stream().map(b -> {
            String guest = b.getSummary() != null ? b.getSummary() : "Voyageur";
            Map<String, Object> m = new HashMap<>();
            m.put("id",            String.valueOf(b.getId()));
            m.put("propertyId",    b.getLocalProperty().getId().toString());
            m.put("propId",        b.getLocalProperty().getId().toString());
            m.put("propName",      b.getLocalProperty().getShortName() != null && !b.getLocalProperty().getShortName().isBlank()
                                     ? b.getLocalProperty().getShortName() : b.getLocalProperty().getName());
            m.put("arrival",       b.getArrival().toString());
            m.put("departure",     b.getDeparture().toString());
            m.put("guestName",     guest);
            m.put("guestFirstName", guest);
            m.put("guestLastName",  "");
            m.put("guestEmail",    "");
            m.put("guestPhone",    "");
            m.put("guestCountry",  "");
            m.put("status",        b.getStatus());
            m.put("channel",       "iCal");
            m.put("numAdult",      null);
            m.put("numChild",      null);
            m.put("totalPrice",    null);
            m.put("notes",         "");
            return m;
        }).toList();

        Map<String, Object> result = new HashMap<>();
        result.put("properties",   properties);
        result.put("bookings",     bookings);
        result.put("blocks",       List.of());
        result.put("calendarData", Map.of());
        return ResponseEntity.ok(result);
    }

    private Beds24Account requireAccount() {
        return accountRepo.findByAppUserId(securityUtils.getCurrentUserId())
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté."));
    }

    private ResponseEntity<Map<String, String>> error(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error", Beds24ApiClient.friendlyMessage(e)));
    }
}
