package com.flowlyrent.service;

import com.flowlyrent.dto.BookingRequest;
import com.flowlyrent.dto.BookingResponse;
import com.flowlyrent.dto.GuestDTO;
import com.flowlyrent.model.Booking;
import com.flowlyrent.model.Payment;
import com.flowlyrent.model.Property;
import com.flowlyrent.model.enums.BookingStatus;
import com.flowlyrent.repository.BookingRepository;
import com.flowlyrent.repository.PaymentRepository;
import com.flowlyrent.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final BookingRepository bookingRepository;
    private final PropertyRepository propertyRepository;
    private final PaymentRepository paymentRepository;
    private final EmailService emailService;

    private static final String STATUS_CANCELLED = "cancelled";

    @Transactional
    public BookingResponse createBooking(BookingRequest request) {
        Property property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("Logement introuvable: " + request.getPropertyId()));

        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                property.getId(), request.getCheckIn(), request.getCheckOut());
        if (!conflicts.isEmpty()) {
            throw new IllegalStateException("Ces dates sont déjà réservées");
        }

        Booking booking = new Booking();
        booking.setProperty(property);
        booking.setArrival(request.getCheckIn());
        booking.setDeparture(request.getCheckOut());
        booking.setNumAdult(request.getGuestCount() > 0 ? request.getGuestCount() : 1);
        booking.setStatus("new");
        booking.applySource(request.getSource());
        booking.setNotes(request.getNotes());
        booking.setReference(generateConfirmationCode());
        booking.setBookingTime(LocalDateTime.now());
        booking.setModifiedTime(LocalDateTime.now());

        // Coordonnées voyageur depuis le DTO
        if (request.getGuest() != null) {
            GuestDTO g = request.getGuest();
            booking.setFirstName(g.getFirstName());
            booking.setLastName(g.getLastName());
            booking.setEmail(g.getEmail());
            booking.setPhone(g.getPhone());
            booking.setCountry(g.getCountry());
        }

        if (request.getTotalAmount() != null) {
            booking.setPrice(request.getTotalAmount());
        } else if (property.getPricePerNight() != null) {
            booking.setPrice(property.getPricePerNight()
                    .multiply(java.math.BigDecimal.valueOf(booking.getNightsCount()))
                    .add(property.getCleaningFee() != null ? property.getCleaningFee() : java.math.BigDecimal.ZERO));
        }

        Booking saved = bookingRepository.save(booking);
        try { emailService.sendBookingConfirmation(saved); } catch (Exception e) { log.warn("Email confirmation: {}", e.getMessage()); }
        return toResponse(saved);
    }

    @Transactional
    public BookingResponse updateBooking(Long id, BookingRequest request) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Réservation introuvable: " + id));

        if (request.getCheckIn()  != null) booking.setArrival(request.getCheckIn());
        if (request.getCheckOut() != null) booking.setDeparture(request.getCheckOut());
        if (request.getGuestCount() > 0)   booking.setNumAdult(request.getGuestCount());
        if (request.getNotes() != null)     booking.setNotes(request.getNotes());
        if (request.getTotalAmount() != null) booking.setPrice(request.getTotalAmount());
        if (request.getGuest() != null) {
            GuestDTO g = request.getGuest();
            if (g.getFirstName() != null) booking.setFirstName(g.getFirstName());
            if (g.getLastName()  != null) booking.setLastName(g.getLastName());
            if (g.getEmail()     != null) booking.setEmail(g.getEmail());
            if (g.getPhone()     != null) booking.setPhone(g.getPhone());
        }
        booking.setModifiedTime(LocalDateTime.now());

        return toResponse(bookingRepository.save(booking));
    }

    @Transactional
    public BookingResponse updateStatus(Long id, BookingStatus status) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Réservation introuvable: " + id));
        booking.applyStatus(status);
        booking.setModifiedTime(LocalDateTime.now());
        return toResponse(bookingRepository.save(booking));
    }

    public BookingResponse getById(Long id) {
        return toResponse(bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Réservation introuvable: " + id)));
    }

    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAllWithDetails().stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public List<BookingResponse> getAllBookingsByUser(Long userId) {
        return bookingRepository.findAllByUserIdWithDetails(userId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public List<BookingResponse> getArrivalsThisWeekByUser(Long userId) {
        LocalDate[] r = currentWeekRange();
        return bookingRepository.findByArrivalBetweenAndStatusNotAndPropertyAppUserId(
                r[0], r[1], STATUS_CANCELLED, userId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<BookingResponse> getDeparturesThisWeekByUser(Long userId) {
        LocalDate[] r = currentWeekRange();
        return bookingRepository.findByDepartureBetweenAndStatusNotAndPropertyAppUserId(
                r[0], r[1], STATUS_CANCELLED, userId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<BookingResponse> getArrivalsForWeekByUser(LocalDate weekStart, Long userId) {
        LocalDate weekEnd = weekStart.plusDays(6);
        return bookingRepository.findByArrivalBetweenAndStatusNotAndPropertyAppUserId(
                weekStart, weekEnd, STATUS_CANCELLED, userId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<BookingResponse> getDeparturesForWeekByUser(LocalDate weekStart, Long userId) {
        LocalDate weekEnd = weekStart.plusDays(6);
        return bookingRepository.findByDepartureBetweenAndStatusNotAndPropertyAppUserId(
                weekStart, weekEnd, STATUS_CANCELLED, userId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private LocalDate[] currentWeekRange() {
        LocalDate today = LocalDate.now();
        return new LocalDate[]{
            today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
            today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
        };
    }

    private String generateConfirmationCode() {
        return "FLR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    public BookingResponse toResponse(Booking booking) {
        BookingResponse resp = new BookingResponse();
        resp.setId(booking.getId());
        resp.setConfirmationCode(booking.getReference());
        resp.setCheckIn(booking.getArrival());
        resp.setCheckOut(booking.getDeparture());
        resp.setNightsCount(booking.getNightsCount());
        resp.setGuestCount(booking.getNumAdult() != null ? booking.getNumAdult() : 0);
        resp.setStatus(booking.getBookingStatus());
        resp.setSource(booking.getBookingSource());
        resp.setTotalAmount(booking.getPrice());
        resp.setNotes(booking.getNotes());
        resp.setCreatedAt(booking.getBookingTime());

        if (booking.getProperty() != null) {
            BookingResponse.PropertySummary ps = new BookingResponse.PropertySummary();
            ps.setId(booking.getProperty().getId());
            ps.setName(booking.getProperty().getName());
            ps.setAddress(booking.getProperty().getAddress());
            ps.setCity(booking.getProperty().getCity());
            resp.setProperty(ps);
        }

        GuestDTO gd = new GuestDTO();
        gd.setFirstName(booking.getFirstName());
        gd.setLastName(booking.getLastName());
        gd.setEmail(booking.getEmail());
        gd.setPhone(booking.getPhone());
        gd.setCountry(booking.getCountry());
        resp.setGuest(gd);

        paymentRepository.findByBookingId(booking.getId()).ifPresent(p -> {
            BookingResponse.PaymentSummary ps = new BookingResponse.PaymentSummary();
            ps.setId(p.getId());
            ps.setStatus(p.getStatus().name());
            ps.setAmount(p.getAmount());
            ps.setPaidAt(p.getPaidAt());
            resp.setPayment(ps);
        });

        return resp;
    }
}
