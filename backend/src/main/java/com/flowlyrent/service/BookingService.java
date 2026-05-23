package com.flowlyrent.service;

import com.flowlyrent.dto.BookingRequest;
import com.flowlyrent.dto.BookingResponse;
import com.flowlyrent.dto.GuestDTO;
import com.flowlyrent.model.Booking;
import com.flowlyrent.model.Guest;
import com.flowlyrent.model.Payment;
import com.flowlyrent.model.Property;
import com.flowlyrent.model.enums.BookingStatus;
import com.flowlyrent.model.enums.PaymentStatus;
import com.flowlyrent.repository.BookingRepository;
import com.flowlyrent.repository.GuestRepository;
import com.flowlyrent.repository.PaymentRepository;
import com.flowlyrent.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final GuestRepository guestRepository;
    private final PropertyRepository propertyRepository;
    private final PaymentRepository paymentRepository;

    @Transactional
    public BookingResponse createBooking(BookingRequest request) {
        Property property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("Logement introuvable: " + request.getPropertyId()));

        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                property.getId(), request.getCheckIn(), request.getCheckOut());
        if (!conflicts.isEmpty()) {
            throw new IllegalStateException("Ces dates sont déjà réservées");
        }

        Guest guest = resolveGuest(request.getGuest());

        Booking booking = new Booking();
        booking.setProperty(property);
        booking.setGuest(guest);
        booking.setCheckIn(request.getCheckIn());
        booking.setCheckOut(request.getCheckOut());
        booking.setGuestCount(request.getGuestCount());
        booking.setSource(request.getSource());
        booking.setNotes(request.getNotes());
        booking.setStatus(BookingStatus.PENDING);
        booking.setConfirmationCode(generateConfirmationCode());

        if (request.getTotalAmount() != null) {
            booking.setTotalAmount(request.getTotalAmount());
        } else {
            booking.setTotalAmount(property.getPricePerNight()
                    .multiply(java.math.BigDecimal.valueOf(booking.getNightsCount()))
                    .add(property.getCleaningFee()));
        }

        booking = bookingRepository.save(booking);
        return toResponse(booking);
    }

    @Transactional
    public BookingResponse updateBooking(Long id, BookingRequest request) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Réservation introuvable: " + id));

        if (request.getCheckIn() != null) booking.setCheckIn(request.getCheckIn());
        if (request.getCheckOut() != null) booking.setCheckOut(request.getCheckOut());
        if (request.getGuestCount() > 0) booking.setGuestCount(request.getGuestCount());
        if (request.getNotes() != null) booking.setNotes(request.getNotes());
        if (request.getTotalAmount() != null) booking.setTotalAmount(request.getTotalAmount());
        if (request.getGuest() != null) {
            Guest guest = resolveGuest(request.getGuest());
            booking.setGuest(guest);
        }

        return toResponse(bookingRepository.save(booking));
    }

    @Transactional
    public BookingResponse updateStatus(Long id, BookingStatus status) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Réservation introuvable: " + id));
        booking.setStatus(status);
        return toResponse(bookingRepository.save(booking));
    }

    public BookingResponse getById(Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Réservation introuvable: " + id));
        return toResponse(booking);
    }

    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAllWithDetails().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<BookingResponse> getArrivalsThisWeek() {
        LocalDate[] weekRange = currentWeekRange();
        return bookingRepository.findByCheckInBetweenAndStatusNot(
                        weekRange[0], weekRange[1], BookingStatus.CANCELLED)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<BookingResponse> getDeparturesThisWeek() {
        LocalDate[] weekRange = currentWeekRange();
        return bookingRepository.findByCheckOutBetweenAndStatusNot(
                        weekRange[0], weekRange[1], BookingStatus.CANCELLED)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<BookingResponse> getArrivalsForWeek(LocalDate weekStart) {
        LocalDate weekEnd = weekStart.plusDays(6);
        return bookingRepository.findByCheckInBetweenAndStatusNot(weekStart, weekEnd, BookingStatus.CANCELLED)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<BookingResponse> getDeparturesForWeek(LocalDate weekStart) {
        LocalDate weekEnd = weekStart.plusDays(6);
        return bookingRepository.findByCheckOutBetweenAndStatusNot(weekStart, weekEnd, BookingStatus.CANCELLED)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private LocalDate[] currentWeekRange() {
        LocalDate today = LocalDate.now();
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate sunday = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        return new LocalDate[]{monday, sunday};
    }

    private Guest resolveGuest(GuestDTO dto) {
        if (dto.getId() != null) {
            return guestRepository.findById(dto.getId())
                    .orElseGet(() -> createGuest(dto));
        }
        return guestRepository.findByEmail(dto.getEmail())
                .orElseGet(() -> createGuest(dto));
    }

    private Guest createGuest(GuestDTO dto) {
        Guest guest = new Guest();
        guest.setFirstName(dto.getFirstName());
        guest.setLastName(dto.getLastName());
        guest.setEmail(dto.getEmail());
        guest.setPhone(dto.getPhone());
        guest.setCountry(dto.getCountry());
        if (dto.getLanguage() != null) guest.setLanguage(dto.getLanguage());
        return guestRepository.save(guest);
    }

    private String generateConfirmationCode() {
        return "FLR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    public BookingResponse toResponse(Booking booking) {
        BookingResponse resp = new BookingResponse();
        resp.setId(booking.getId());
        resp.setConfirmationCode(booking.getConfirmationCode());
        resp.setCheckIn(booking.getCheckIn());
        resp.setCheckOut(booking.getCheckOut());
        resp.setNightsCount(booking.getNightsCount());
        resp.setGuestCount(booking.getGuestCount() != null ? booking.getGuestCount() : 0);
        resp.setStatus(booking.getStatus());
        resp.setSource(booking.getSource());
        resp.setTotalAmount(booking.getTotalAmount());
        resp.setNotes(booking.getNotes());
        resp.setCreatedAt(booking.getCreatedAt());

        if (booking.getProperty() != null) {
            BookingResponse.PropertySummary ps = new BookingResponse.PropertySummary();
            ps.setId(booking.getProperty().getId());
            ps.setName(booking.getProperty().getName());
            ps.setAddress(booking.getProperty().getAddress());
            ps.setCity(booking.getProperty().getCity());
            resp.setProperty(ps);
        }

        if (booking.getGuest() != null) {
            GuestDTO gd = new GuestDTO();
            gd.setId(booking.getGuest().getId());
            gd.setFirstName(booking.getGuest().getFirstName());
            gd.setLastName(booking.getGuest().getLastName());
            gd.setEmail(booking.getGuest().getEmail());
            gd.setPhone(booking.getGuest().getPhone());
            gd.setCountry(booking.getGuest().getCountry());
            resp.setGuest(gd);
        }

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
