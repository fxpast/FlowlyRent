package com.flowlyrent.service;

import com.flowlyrent.model.Booking;
import com.flowlyrent.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final BookingRepository bookingRepository;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    @Value("${app.name:FlowlyRent}")
    private String appName;

    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.FRENCH);

    // -----------------------------------------------------------------------
    // Confirmation de réservation (envoyée au voyageur)
    // -----------------------------------------------------------------------

    public void sendBookingConfirmation(Booking booking) {
        if (!isConfigured() || booking.getEmail() == null || booking.getEmail().contains("@ical.local")) return;

        String subject = appName + " — Confirmation de votre réservation " + booking.getReference();
        String html = """
            <div style="font-family:sans-serif;max-width:600px;margin:auto">
              <h2 style="color:#1a237e">%s — Réservation confirmée</h2>
              <p>Bonjour %s,</p>
              <p>Votre réservation est confirmée :</p>
              <table style="border-collapse:collapse;width:100%%">
                <tr><td style="padding:8px;border:1px solid #e0e0e0"><strong>Référence</strong></td>
                    <td style="padding:8px;border:1px solid #e0e0e0">%s</td></tr>
                <tr><td style="padding:8px;border:1px solid #e0e0e0"><strong>Logement</strong></td>
                    <td style="padding:8px;border:1px solid #e0e0e0">%s</td></tr>
                <tr><td style="padding:8px;border:1px solid #e0e0e0"><strong>Arrivée</strong></td>
                    <td style="padding:8px;border:1px solid #e0e0e0">%s</td></tr>
                <tr><td style="padding:8px;border:1px solid #e0e0e0"><strong>Départ</strong></td>
                    <td style="padding:8px;border:1px solid #e0e0e0">%s</td></tr>
                <tr><td style="padding:8px;border:1px solid #e0e0e0"><strong>Voyageurs</strong></td>
                    <td style="padding:8px;border:1px solid #e0e0e0">%d adulte(s)</td></tr>
                %s
              </table>
              <p style="margin-top:24px;color:#666;font-size:13px">
                Cet email a été envoyé par %s. Pour toute question, répondez à cet email.
              </p>
            </div>
            """.formatted(
                appName,
                firstName(booking),
                booking.getReference(),
                booking.getProperty() != null ? booking.getProperty().getName() : "",
                booking.getArrival() != null ? booking.getArrival().format(FR) : "",
                booking.getDeparture() != null ? booking.getDeparture().format(FR) : "",
                booking.getNumAdult() != null ? booking.getNumAdult() : 1,
                booking.getPrice() != null
                    ? "<tr><td style=\"padding:8px;border:1px solid #e0e0e0\"><strong>Montant total</strong></td>" +
                      "<td style=\"padding:8px;border:1px solid #e0e0e0\">" + booking.getPrice() + " €</td></tr>"
                    : "",
                appName
        );
        send(booking.getEmail(), subject, html);
    }

    // -----------------------------------------------------------------------
    // Reçu de paiement
    // -----------------------------------------------------------------------

    public void sendPaymentReceipt(Booking booking, java.math.BigDecimal amount) {
        if (!isConfigured() || booking.getEmail() == null || booking.getEmail().contains("@ical.local")) return;

        String subject = appName + " — Reçu de paiement " + booking.getReference();
        String html = """
            <div style="font-family:sans-serif;max-width:600px;margin:auto">
              <h2 style="color:#2e7d32">%s — Paiement reçu ✓</h2>
              <p>Bonjour %s,</p>
              <p>Nous avons bien reçu votre paiement de <strong>%s €</strong>
                 pour la réservation <strong>%s</strong>.</p>
              <p>Votre séjour est confirmé du <strong>%s</strong> au <strong>%s</strong>.</p>
              <p style="margin-top:24px;color:#666;font-size:13px">
                Cet email a été envoyé par %s.
              </p>
            </div>
            """.formatted(
                appName, firstName(booking),
                amount, booking.getReference(),
                booking.getArrival() != null ? booking.getArrival().format(FR) : "",
                booking.getDeparture() != null ? booking.getDeparture().format(FR) : "",
                appName
        );
        send(booking.getEmail(), subject, html);
    }

    // -----------------------------------------------------------------------
    // Rappel J-1 avant arrivée (cron quotidien à 9h)
    // -----------------------------------------------------------------------

    @Scheduled(cron = "0 0 9 * * *")
    public void sendArrivalReminders() {
        if (!isConfigured()) return;
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<Booking> arriving = bookingRepository.findByArrivalDate(tomorrow);
        log.info("Rappels J-1 : {} réservations arrivant le {}", arriving.size(), tomorrow);

        for (Booking booking : arriving) {
            if (booking.getEmail() == null || booking.getEmail().contains("@ical.local")) continue;
            String subject = "Rappel — Votre arrivée demain · " + booking.getReference();
            String html = """
                <div style="font-family:sans-serif;max-width:600px;margin:auto">
                  <h2 style="color:#1a237e">%s — Rappel : arrivée demain</h2>
                  <p>Bonjour %s,</p>
                  <p>Nous vous rappelons que votre arrivée est prévue <strong>demain, le %s</strong>.</p>
                  %s
                  <p style="margin-top:24px;color:#666;font-size:13px">
                    Cet email a été envoyé par %s.
                  </p>
                </div>
                """.formatted(
                    appName, firstName(booking),
                    tomorrow.format(FR),
                    booking.getProperty() != null && booking.getProperty().getCheckInTime() != null
                        ? "<p>Heure d'arrivée : <strong>" + booking.getProperty().getCheckInTime() + "</strong></p>"
                        : "",
                    appName
            );
            send(booking.getEmail(), subject, html);
        }
    }

    // -----------------------------------------------------------------------

    private void send(String to, String subject, String html) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(msg);
            log.info("Email envoyé à {} : {}", to, subject);
        } catch (Exception e) {
            log.warn("Impossible d'envoyer l'email à {} : {}", to, e.getMessage());
        }
    }

    private boolean isConfigured() {
        return fromAddress != null && !fromAddress.isBlank();
    }

    private String firstName(Booking b) {
        return b.getFirstName() != null && !b.getFirstName().isBlank() ? b.getFirstName() : "cher voyageur";
    }
}
