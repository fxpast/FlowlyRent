package com.flowlyrent.service;

import com.flowlyrent.model.Booking;
import com.flowlyrent.model.Channel;
import com.flowlyrent.model.enums.Platform;
import com.flowlyrent.model.enums.SyncType;
import com.flowlyrent.repository.BookingRepository;
import com.flowlyrent.repository.ChannelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.fortuna.ical4j.data.CalendarBuilder;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.Component;
import net.fortuna.ical4j.model.Property;
import net.fortuna.ical4j.model.component.VEvent;
import net.fortuna.ical4j.model.property.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ICalSyncService {

    private final ChannelRepository channelRepository;
    private final BookingRepository bookingRepository;

    @Scheduled(cron = "${sync.ical.cron:0 0 */2 * * *}")
    public void scheduledSync() {
        log.info("Démarrage de la synchronisation iCal planifiée");
        channelRepository.findByActiveTrue().stream()
                .filter(c -> c.getSyncType() == SyncType.ICAL)
                .forEach(this::syncChannel);
    }

    @Transactional
    public com.flowlyrent.service.SyncResult syncChannel(Channel channel) {
        com.flowlyrent.service.SyncResult result = new com.flowlyrent.service.SyncResult();
        result.channelId = channel.getId();
        result.platform = channel.getPlatform();

        if (channel.getIcalUrl() == null || channel.getIcalUrl().isBlank()) {
            result.status = "NO_ICAL_URL";
            return result;
        }

        try {
            String icalContent = fetchICalContent(channel.getIcalUrl());
            CalendarBuilder builder = new CalendarBuilder();
            Calendar calendar = builder.build(new java.io.StringReader(icalContent));

            int imported = 0;
            for (Object comp : calendar.getComponents(Component.VEVENT)) {
                VEvent event = (VEvent) comp;
                if (processEvent(event, channel)) {
                    imported++;
                }
            }

            channel.setLastSync(LocalDateTime.now());
            channel.setLastSyncBookingsCount(imported);
            channel.setLastSyncStatus("OK");
            channelRepository.save(channel);

            result.bookingsImported = imported;
            result.status = "OK";
            log.info("Sync {} ({}): {} réservations importées", channel.getPlatform(), channel.getId(), imported);

        } catch (Exception e) {
            log.error("Erreur sync channel {}: {}", channel.getId(), e.getMessage(), e);
            channel.setLastSyncStatus("ERROR: " + e.getMessage());
            channelRepository.save(channel);
            result.status = "ERROR";
            result.error = e.getMessage();
        }

        return result;
    }

    private boolean processEvent(VEvent event, Channel channel) {
        try {
            Optional<Uid> uidOpt = event.getProperty(Property.UID);
            if (uidOpt.isEmpty()) return false;

            String externalId = uidOpt.get().getValue();
            if (bookingRepository.findByApiReference(externalId).isPresent()) {
                return false;
            }

            Optional<DtStart<?>> dtStartOpt = event.getProperty(Property.DTSTART);
            Optional<DtEnd<?>> dtEndOpt = event.getProperty(Property.DTEND);
            if (dtStartOpt.isEmpty() || dtEndOpt.isEmpty()) return false;

            LocalDate checkIn = toLocalDate(dtStartOpt.get().getDate());
            LocalDate checkOut = toLocalDate(dtEndOpt.get().getDate());

            if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
                return false;
            }

            Optional<Summary> summaryOpt = event.getProperty(Property.SUMMARY);
            String summary = summaryOpt.map(Property::getValue).orElse("Réservation externe");

            Optional<Description> descOpt = event.getProperty(Property.DESCRIPTION);
            String description = descOpt.map(Property::getValue).orElse("");

            String guestName = extractGuestName(summary, channel.getPlatform());

            Booking booking = new Booking();
            booking.setProperty(channel.getProperty());
            booking.setFirstName(guestName);
            booking.setLastName("(" + channel.getPlatform().name() + ")");
            booking.setEmail(channel.getPlatform().name().toLowerCase() + "-" + externalId.hashCode() + "@ical.local");
            booking.setArrival(checkIn);
            booking.setDeparture(checkOut);
            booking.setApiReference(externalId);
            booking.setChannel(platformToChannel(channel.getPlatform()));
            booking.setStatus("confirmed");
            booking.setNumAdult(1);
            booking.setNotes(description.length() > 500 ? description.substring(0, 500) : description);
            booking.setPrice(BigDecimal.ZERO);
            booking.setReference(externalId.length() > 20 ? externalId.substring(0, 20) : externalId);
            booking.setBookingTime(java.time.LocalDateTime.now());

            bookingRepository.save(booking);
            return true;

        } catch (Exception e) {
            log.warn("Impossible de traiter l'événement iCal: {}", e.getMessage());
            return false;
        }
    }

    private String extractGuestName(String summary, Platform platform) {
        if (summary == null) return "Voyageur";
        // Booking.com: "CLOSED - Guest Name", Airbnb: "Airbnb (Guest)", Abritel: "Reserved"
        String cleaned = summary.replaceAll("(?i)(closed|reserved|airbnb|booking|abritel)\\s*[-()]?\\s*", "").trim();
        return cleaned.isEmpty() ? "Voyageur" : cleaned;
    }

    private LocalDate toLocalDate(java.time.temporal.Temporal temporal) {
        try {
            if (temporal instanceof LocalDate ld) {
                return ld;
            } else if (temporal instanceof LocalDateTime ldt) {
                return ldt.toLocalDate();
            } else if (temporal instanceof java.time.ZonedDateTime zdt) {
                return zdt.toLocalDate();
            } else if (temporal instanceof java.time.Instant instant) {
                return instant.atZone(ZoneId.systemDefault()).toLocalDate();
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private String platformToChannel(Platform platform) {
        return switch (platform) {
            case BOOKING_COM -> "booking";
            case AIRBNB      -> "airbnb";
            case ABRITEL     -> "abritel";
            default          -> "ical";
        };
    }

    private String fetchICalContent(String url) throws Exception {
        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "FlowlyRent/1.0 iCal Sync")
                .GET()
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("HTTP " + response.statusCode() + " lors de la récupération de l'iCal");
        }
        return response.body();
    }

}
