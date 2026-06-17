package com.flowlyrent.controller;

import com.flowlyrent.model.IcalBooking;
import com.flowlyrent.model.LocalProperty;
import com.flowlyrent.repository.IcalBookingRepository;
import com.flowlyrent.repository.LocalPropertyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/public/ical")
@RequiredArgsConstructor
public class PublicIcalController {

    private final LocalPropertyRepository localPropertyRepo;
    private final IcalBookingRepository icalBookingRepo;

    @GetMapping(value = "/{token}.ics", produces = "text/calendar")
    public ResponseEntity<String> feed(@PathVariable String token) {
        LocalProperty prop = localPropertyRepo.findByIcalFeedToken(token).orElse(null);
        if (prop == null) return ResponseEntity.notFound().build();

        List<IcalBooking> bookings = icalBookingRepo.findByLocalPropertyId(prop.getId());

        StringBuilder sb = new StringBuilder();
        sb.append("BEGIN:VCALENDAR\r\n");
        sb.append("VERSION:2.0\r\n");
        sb.append("PRODID:-//FlowlyRent//FlowlyRent//FR\r\n");
        sb.append("CALSCALE:GREGORIAN\r\n");
        sb.append("METHOD:PUBLISH\r\n");
        String calName = prop.getShortName() != null && !prop.getShortName().isBlank()
                ? prop.getShortName() : prop.getName();
        sb.append("X-WR-CALNAME:").append(escape(calName)).append("\r\n");

        for (IcalBooking b : bookings) {
            if (b.getArrival() == null || b.getDeparture() == null) continue;
            String uid = b.getIcalUid().contains("@") ? b.getIcalUid()
                    : b.getIcalUid() + "@flowlyrent.com";
            sb.append("BEGIN:VEVENT\r\n");
            sb.append("UID:").append(uid).append("\r\n");
            sb.append("DTSTART;VALUE=DATE:").append(b.getArrival().toString().replace("-", "")).append("\r\n");
            sb.append("DTEND;VALUE=DATE:").append(b.getDeparture().toString().replace("-", "")).append("\r\n");
            String summary = b.getSummary() != null && !b.getSummary().isBlank() ? b.getSummary() : "Réservé";
            sb.append("SUMMARY:").append(escape(summary)).append("\r\n");
            sb.append("STATUS:CONFIRMED\r\n");
            sb.append("END:VEVENT\r\n");
        }

        sb.append("END:VCALENDAR\r\n");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/calendar; charset=UTF-8")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"calendar.ics\"")
                .body(sb.toString());
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n");
    }
}
