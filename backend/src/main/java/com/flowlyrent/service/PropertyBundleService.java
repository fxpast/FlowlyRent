package com.flowlyrent.service;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.PropertyBundle;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.PropertyBundleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyBundleService {

    private final PropertyBundleRepository repo;
    private final AppUserRepository userRepo;
    private final Beds24AccountRepository accountRepo;
    private final Beds24ApiClient beds24;

    // ─── CRUD ──────────────────────────────────────────────────────────────────

    public List<PropertyBundle> list(Long userId) {
        return repo.findByUserId(userId);
    }

    public PropertyBundle create(Long userId, PropertyBundle form) {
        AppUser user = userRepo.findById(userId).orElseThrow();
        PropertyBundle bundle = new PropertyBundle();
        bundle.setUser(user);
        applyForm(bundle, form);
        return repo.save(bundle);
    }

    public PropertyBundle update(Long userId, Long id, PropertyBundle form) {
        PropertyBundle bundle = repo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Bundle introuvable."));
        applyForm(bundle, form);
        return repo.save(bundle);
    }

    public void delete(Long userId, Long id) {
        PropertyBundle bundle = repo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Bundle introuvable."));
        repo.delete(bundle);
    }

    private void applyForm(PropertyBundle bundle, PropertyBundle form) {
        bundle.setName(form.getName());
        bundle.setBundlePropertyId(form.getBundlePropertyId());
        bundle.setMemberPropertyIds(new ArrayList<>(form.getMemberPropertyIds()));
        bundle.setEnabled(form.isEnabled());
        bundle.setHorizonDays(form.getHorizonDays() != null ? form.getHorizonDays() : 365);
    }

    // ─── Exécution ─────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> runNow(Long userId, Long id) {
        PropertyBundle bundle = repo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Bundle introuvable."));
        Beds24Account account = accountRepo.findByAppUserId(userId)
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté."));

        try {
            int updated = sync(bundle, account);
            bundle.setLastRunAt(LocalDateTime.now());
            bundle.setLastRunStatus("OK (" + updated + " logement" + (updated > 1 ? "s" : "") + ")");
            repo.save(bundle);
            return Map.of("success", true, "propertiesUpdated", updated);
        } catch (Exception e) {
            log.error("[Bundle] Erreur synchronisation bundleId={} userId={}: {}", id, userId, e.getMessage());
            bundle.setLastRunAt(LocalDateTime.now());
            bundle.setLastRunStatus("Erreur : " + e.getMessage());
            repo.save(bundle);
            return Map.of("success", false, "error", e.getMessage());
        }
    }

    private int sync(PropertyBundle bundle, Beds24Account account) throws Exception {
        String token = beds24.tokenFor(account);

        LocalDate today = LocalDate.now();
        LocalDate horizonEnd = today.plusDays(bundle.getHorizonDays());

        Map<String, String> calParams = new HashMap<>();
        calParams.put("startDate", today.toString());
        calParams.put("endDate", today.toString());
        List<Map<String, Object>> rooms = beds24.getCalendar(token, calParams);

        Map<String, Long> roomIdByProperty = new HashMap<>();
        for (Map<String, Object> room : rooms) {
            String propId = idStr(room.get("propertyId"));
            String roomId = idStr(room.get("roomId"));
            if (propId != null && roomId != null) {
                roomIdByProperty.putIfAbsent(propId, Long.parseLong(roomId));
            }
        }

        String bundlePropId = bundle.getBundlePropertyId();
        List<String> memberIds = bundle.getMemberPropertyIds();

        Long bundleRoomId = roomIdByProperty.get(bundlePropId);
        if (bundleRoomId == null) {
            throw new IllegalStateException("Logement bundle introuvable (id " + bundlePropId + ")");
        }

        List<Long> memberRoomIds = new ArrayList<>();
        for (String memberId : memberIds) {
            Long roomId = roomIdByProperty.get(memberId);
            if (roomId == null) {
                throw new IllegalStateException("Logement membre introuvable (id " + memberId + ")");
            }
            memberRoomIds.add(roomId);
        }

        Map<String, String> bookingParams = new HashMap<>();
        bookingParams.put("arrivalFrom", today.minusDays(400).toString());
        bookingParams.put("arrivalTo", horizonEnd.toString());
        List<Map<String, Object>> bookings = beds24.getBookingsAllStatuses(token, bookingParams);

        Set<LocalDate> bundleBookedDates = bookedDates(bookings, bundlePropId, today, horizonEnd);
        Set<LocalDate> membersBookedDates = new TreeSet<>();
        for (String memberId : memberIds) {
            membersBookedDates.addAll(bookedDates(bookings, memberId, today, horizonEnd));
        }

        List<Map<String, Object>> payload = new ArrayList<>();
        // Le bundle est blackout si au moins un logement membre est réservé
        payload.add(buildRoomPayload(bundleRoomId, today, horizonEnd, membersBookedDates));
        // Chaque logement membre est blackout si le bundle est réservé
        for (Long roomId : memberRoomIds) {
            payload.add(buildRoomPayload(roomId, today, horizonEnd, bundleBookedDates));
        }

        beds24.updateCalendar(token, payload);
        return payload.size();
    }

    private Set<LocalDate> bookedDates(List<Map<String, Object>> bookings, String propId, LocalDate from, LocalDate to) {
        Set<LocalDate> dates = new TreeSet<>();
        for (Map<String, Object> b : bookings) {
            String status = Objects.toString(b.get("status"), "").toLowerCase();
            if (!status.equals("new") && !status.equals("confirmed")) continue;

            Object bPid = b.get("propId") != null ? b.get("propId") : b.get("propertyId");
            if (!propId.equals(idStr(bPid))) continue;

            String arrivalStr = Objects.toString(b.get("arrival"), "");
            String departureStr = Objects.toString(b.get("departure"), "");
            if (arrivalStr.length() < 10 || departureStr.length() < 10) continue;

            LocalDate arr = LocalDate.parse(arrivalStr.substring(0, 10));
            LocalDate dep = LocalDate.parse(departureStr.substring(0, 10));

            LocalDate d = arr.isBefore(from) ? from : arr;
            LocalDate end = dep.isAfter(to) ? to : dep;
            while (d.isBefore(end)) {
                dates.add(d);
                d = d.plusDays(1);
            }
        }
        return dates;
    }

    private Map<String, Object> buildRoomPayload(Long roomId, LocalDate from, LocalDate to, Set<LocalDate> blackoutDates) {
        List<Map<String, Object>> calendar = new ArrayList<>();

        Map<String, Object> reset = new LinkedHashMap<>();
        reset.put("from", from.toString());
        reset.put("to", to.toString());
        reset.put("override", "none");
        calendar.add(reset);

        List<LocalDate> sorted = new ArrayList<>(blackoutDates);
        int i = 0;
        while (i < sorted.size()) {
            LocalDate start = sorted.get(i);
            LocalDate end = start;
            int j = i + 1;
            while (j < sorted.size() && sorted.get(j).equals(end.plusDays(1))) {
                end = sorted.get(j);
                j++;
            }
            Map<String, Object> range = new LinkedHashMap<>();
            range.put("from", start.toString());
            range.put("to", end.toString());
            range.put("override", "blackout");
            calendar.add(range);
            i = j;
        }

        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("roomId", roomId);
        entry.put("calendar", calendar);
        return entry;
    }

    private String idStr(Object value) {
        if (value == null) return null;
        String s = value.toString();
        if (s.contains(".")) {
            try { return String.valueOf((long) Double.parseDouble(s)); } catch (Exception ignored) {}
        }
        return s.isBlank() ? null : s;
    }

    // ─── Exécution automatique (toutes les 3 heures) ───────────────────────────

    @Scheduled(cron = "0 0 */3 * * *")
    public void runScheduled() {
        List<PropertyBundle> bundles = repo.findByEnabledTrue();
        if (bundles.isEmpty()) return;
        log.info("[Bundle] Synchronisation automatique pour {} bundle(s) actif(s)", bundles.size());
        for (PropertyBundle bundle : bundles) {
            try {
                runNow(bundle.getUser().getId(), bundle.getId());
            } catch (Exception e) {
                log.error("[Bundle] Échec synchronisation automatique bundleId={}: {}", bundle.getId(), e.getMessage());
            }
        }
    }
}
