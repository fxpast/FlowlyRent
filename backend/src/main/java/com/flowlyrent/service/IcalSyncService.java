package com.flowlyrent.service;

import com.flowlyrent.model.IcalBooking;
import com.flowlyrent.model.LocalProperty;
import com.flowlyrent.model.PropertyIcalSource;
import com.flowlyrent.repository.IcalBookingRepository;
import com.flowlyrent.repository.LocalPropertyRepository;
import com.flowlyrent.repository.PropertyConfigRepository;
import com.flowlyrent.repository.PropertyIcalSourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.fortuna.ical4j.data.CalendarBuilder;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.Component;
import net.fortuna.ical4j.model.component.VEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.*;
import java.time.temporal.Temporal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class IcalSyncService {

    private final LocalPropertyRepository localPropertyRepo;
    private final IcalBookingRepository icalBookingRepo;
    private final PropertyConfigRepository propertyConfigRepo;
    private final PropertyIcalSourceRepository icalSourceRepo;

    public void syncUser(Long userId) {
        List<LocalProperty> props = localPropertyRepo.findByUserIdOrderByCreatedAtAsc(userId);
        for (LocalProperty prop : props) {
            try {
                syncProperty(prop);
            } catch (Exception e) {
                log.warn("[iCal] Erreur sync logement {} : {}", prop.getId(), e.getMessage());
            }
        }
    }

    public void syncAllUsers() {
        List<LocalProperty> all = localPropertyRepo.findAll();
        for (LocalProperty prop : all) {
            try {
                syncProperty(prop);
            } catch (Exception e) {
                log.warn("[iCal] Erreur sync logement {} : {}", prop.getId(), e.getMessage());
            }
        }
    }

    @Transactional
    public void syncProperty(LocalProperty property) throws Exception {
        List<PropertyIcalSource> sources = icalSourceRepo.findByLocalPropertyIdOrderByIdAsc(property.getId());
        if (sources.isEmpty()) return;
        Exception last = null;
        for (PropertyIcalSource source : sources) {
            try {
                syncSource(source);
            } catch (Exception e) {
                log.warn("[iCal] Erreur source {} ({}) : {}", source.getId(), source.getName(), e.getMessage());
                last = e;
            }
        }
        if (sources.size() == 1 && last != null) throw last;
    }

    @Transactional
    public int syncSource(PropertyIcalSource source) throws Exception {
        LocalProperty property = source.getLocalProperty();
        log.info("[iCal] Sync source {} ({}) — logement {}", source.getId(), source.getName(), property.getId());

        URL url = new URL(source.getUrl());
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(30000);
        conn.setRequestProperty("User-Agent", "FlowlyRent/1.0");

        Calendar calendar;
        try (InputStream is = conn.getInputStream()) {
            CalendarBuilder builder = new CalendarBuilder();
            calendar = builder.build(is);
        }

        Set<String> seenUids = new HashSet<>();
        List<VEvent> events = calendar.getComponents(Component.VEVENT);

        for (VEvent event : events) {
            try {
                String uid = event.getUid().map(u -> u.getValue()).orElse(null);
                if (uid == null || uid.isBlank()) continue;

                boolean cancelled = event.getStatus()
                        .map(s -> "CANCELLED".equalsIgnoreCase(s.getValue()))
                        .orElse(false);
                if (cancelled) continue;

                LocalDate arrival = event.getDateTimeStart()
                        .map(dt -> toLocalDate(dt.getDate()))
                        .orElse(null);
                LocalDate departure = event.getDateTimeEnd()
                        .map(dt -> toLocalDate(dt.getDate()))
                        .orElse(null);
                if (arrival == null || departure == null || !arrival.isBefore(departure)) continue;

                String summary = event.getSummary()
                        .map(s -> s.getValue())
                        .orElse("");

                IcalBooking booking = icalBookingRepo
                        .findByLocalPropertyIdAndIcalUid(property.getId(), uid)
                        .orElseGet(IcalBooking::new);
                if (booking.getId() == null) {
                    booking.setUser(property.getUser());
                    booking.setLocalProperty(property);
                    booking.setIcalUid(uid);
                    booking.setSourceId(source.getId());
                }
                booking.setArrival(arrival);
                booking.setDeparture(departure);
                booking.setSummary(summary);
                booking.setStatus("confirmed");
                icalBookingRepo.save(booking);
                seenUids.add(uid);

            } catch (Exception e) {
                log.debug("[iCal] Event ignoré : {}", e.getMessage());
            }
        }

        if (!seenUids.isEmpty()) {
            icalBookingRepo.deleteBySourceIdAndIcalUidNotIn(source.getId(), seenUids);
        } else {
            icalBookingRepo.deleteBySourceId(source.getId());
        }

        log.info("[iCal] Source {} terminée — {} événements", source.getId(), seenUids.size());
        return seenUids.size();
    }

    private LocalDate toLocalDate(Temporal t) {
        if (t == null) return null;
        if (t instanceof LocalDate ld) return ld;
        if (t instanceof ZonedDateTime zdt) return zdt.toLocalDate();
        if (t instanceof LocalDateTime ldt) return ldt.toLocalDate();
        if (t instanceof Instant i) return i.atZone(ZoneId.systemDefault()).toLocalDate();
        try { return LocalDate.parse(t.toString().substring(0, 10)); } catch (Exception ignored) {}
        return null;
    }
}
