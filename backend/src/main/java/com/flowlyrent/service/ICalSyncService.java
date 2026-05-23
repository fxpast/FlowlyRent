package com.flowlyrent.service;

import com.flowlyrent.model.Booking;
import com.flowlyrent.model.Channel;
import com.flowlyrent.model.Guest;
import com.flowlyrent.model.enums.BookingSource;
import com.flowlyrent.model.enums.BookingStatus;
import com.flowlyrent.model.enums.Platform;
import com.flowlyrent.repository.BookingRepository;
import com.flowlyrent.repository.ChannelRepository;
import com.flowlyrent.repository.GuestRepository;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ICalSyncService {

    private final ChannelRepository channelRepository;
    private final BookingRepository bookingRepository;
    private final GuestRepository guestRepository;

    @Scheduled(cron = "${sync.ical.cron:0 0 */2 * * *}")
    public void scheduledSync() {
        log.info("Démarrage de la synchronisation iCal planifiée");
        List<Channel> channels = channelRepository.findByActiveTrue();
        channels.forEach(this::syncChannel);
    }

    @Transactional
    public SyncResult syncChannel(Channel channel) {
        SyncResult result = new SyncResult();
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
            Uid uid = event.getProperty(Property.UID);
            if (uid == null) return false;

            String externalId = uid.getValue();
            if (bookingRepository.existsByExternalId(externalId)) {
                return false;
            }

            DtStart dtStart = event.getProperty(Property.DTSTART);
            DtEnd dtEnd = event.getProperty(Property.DTEND);
            if (dtStart == null || dtEnd == null) return false;

            LocalDate checkIn = toLocalDate(dtStart.getDate());
            LocalDate checkOut = toLocalDate(dtEnd.getDate());

            if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
                return false;
            }

            Summary summaryProp = event.getProperty(Property.SUMMARY);
            String summary = summaryProp != null ? summaryProp.getValue() : "Réservation externe";

            Description descProp = event.getProperty(Property.DESCRIPTION);
            String description = descProp != null ? descProp.getValue() : "";

            Guest guest = extractOrCreateGuest(summary, description, channel.getPlatform());

            Booking booking = new Booking();
            booking.setProperty(channel.getProperty());
            booking.setGuest(guest);
            booking.setCheckIn(checkIn);
            booking.setCheckOut(checkOut);
            booking.setExternalId(externalId);
            booking.setSource(platformToSource(channel.getPlatform()));
            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setGuestCount(1);
            booking.setNotes(description.length() > 500 ? description.substring(0, 500) : description);
            booking.setTotalAmount(BigDecimal.ZERO);
            booking.setConfirmationCode(externalId.length() > 20 ? externalId.substring(0, 20) : externalId);

            bookingRepository.save(booking);
            return true;

        } catch (Exception e) {
            log.warn("Impossible de traiter l'événement iCal: {}", e.getMessage());
            return false;
        }
    }

    private Guest extractOrCreateGuest(String summary, String description, Platform platform) {
        String guestEmail = platform.name().toLowerCase() + "-guest@flowlyrent.local";
        String guestName = extractGuestName(summary, platform);

        return guestRepository.findByEmail(guestEmail).orElseGet(() -> {
            Guest g = new Guest();
            g.setFirstName(guestName);
            g.setLastName("(" + platform.name() + ")");
            g.setEmail(guestEmail);
            return guestRepository.save(g);
        });
    }

    private String extractGuestName(String summary, Platform platform) {
        if (summary == null) return "Voyageur";
        // Booking.com: "CLOSED - Guest Name", Airbnb: "Airbnb (Guest)", Abritel: "Reserved"
        String cleaned = summary.replaceAll("(?i)(closed|reserved|airbnb|booking|abritel)\\s*[-()]?\\s*", "").trim();
        return cleaned.isEmpty() ? "Voyageur" : cleaned;
    }

    private LocalDate toLocalDate(net.fortuna.ical4j.model.Date date) {
        try {
            if (date instanceof net.fortuna.ical4j.model.DateTime dt) {
                return dt.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            }
            return LocalDate.parse(date.toString());
        } catch (Exception e) {
            return null;
        }
    }

    private BookingSource platformToSource(Platform platform) {
        return switch (platform) {
            case BOOKING_COM -> BookingSource.BOOKING_COM;
            case AIRBNB -> BookingSource.AIRBNB;
            case ABRITEL -> BookingSource.ABRITEL;
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

    public static class SyncResult {
        public Long channelId;
        public Platform platform;
        public String status;
        public int bookingsImported;
        public String error;
    }
}
