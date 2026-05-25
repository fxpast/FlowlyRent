package com.flowlyrent.repository;

import com.flowlyrent.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    // status = chaîne Beds24 : "confirmed", "cancelled", "closed", "new"
    List<Booking> findByArrivalBetweenAndStatusNot(LocalDate from, LocalDate to, String status);

    List<Booking> findByDepartureBetweenAndStatusNot(LocalDate from, LocalDate to, String status);

    // apiReference stocke "beds24-{id}" ou l'uid iCal
    Optional<Booking> findByApiReference(String apiReference);

    @Query("SELECT b FROM Booking b WHERE b.property.id = :propertyId " +
           "AND b.status != 'cancelled' AND b.status != 'canceled' " +
           "AND b.arrival < :departure AND b.departure > :arrival")
    List<Booking> findConflictingBookings(@Param("propertyId") Long propertyId,
                                          @Param("arrival") LocalDate arrival,
                                          @Param("departure") LocalDate departure);

    @Query("SELECT b FROM Booking b JOIN FETCH b.property ORDER BY b.bookingTime DESC")
    List<Booking> findAllWithDetails();

    @Query("SELECT b FROM Booking b JOIN FETCH b.property WHERE b.property.appUser.id = :userId ORDER BY b.bookingTime DESC")
    List<Booking> findAllByUserIdWithDetails(@Param("userId") Long userId);

    List<Booking> findByArrivalBetweenAndStatusNotAndPropertyAppUserId(
            LocalDate from, LocalDate to, String status, Long userId);

    List<Booking> findByDepartureBetweenAndStatusNotAndPropertyAppUserId(
            LocalDate from, LocalDate to, String status, Long userId);

    @Query("SELECT b FROM Booking b JOIN FETCH b.property WHERE b.property.appUser.id = :userId " +
           "AND b.status != 'cancelled' AND b.status != 'canceled' " +
           "AND b.arrival < :to AND b.departure > :from ORDER BY b.arrival")
    List<Booking> findByUserIdAndDateRange(@Param("userId") Long userId,
                                           @Param("from") LocalDate from,
                                           @Param("to") LocalDate to);

    // --- Stats ---

    @Query(value =
        "SELECT YEAR(b.arrival) AS yr, MONTH(b.arrival) AS mo, " +
        "COALESCE(SUM(b.price), 0) AS revenue, COUNT(b.id) AS cnt " +
        "FROM bookings b JOIN properties p ON b.propertyId = p.id " +
        "WHERE p.user_id = :userId AND b.status NOT IN ('cancelled','canceled') " +
        "AND b.arrival >= :from " +
        "GROUP BY YEAR(b.arrival), MONTH(b.arrival) ORDER BY yr, mo",
        nativeQuery = true)
    List<Object[]> revenueByMonth(@Param("userId") Long userId, @Param("from") LocalDate from);

    @Query(value =
        "SELECT COALESCE(b.channel,'direct') AS ch, " +
        "COALESCE(SUM(b.price),0) AS revenue, COUNT(b.id) AS cnt " +
        "FROM bookings b JOIN properties p ON b.propertyId = p.id " +
        "WHERE p.user_id = :userId AND b.status NOT IN ('cancelled','canceled') " +
        "AND YEAR(b.arrival) = :year GROUP BY ch",
        nativeQuery = true)
    List<Object[]> revenueByChannel(@Param("userId") Long userId, @Param("year") int year);

    @Query(value =
        "SELECT COALESCE(SUM(b.price),0) FROM bookings b JOIN properties p ON b.propertyId = p.id " +
        "WHERE p.user_id = :userId AND b.status NOT IN ('cancelled','canceled') " +
        "AND YEAR(b.arrival) = :year AND MONTH(b.arrival) = :month",
        nativeQuery = true)
    java.math.BigDecimal revenueForMonth(@Param("userId") Long userId,
                                         @Param("year") int year, @Param("month") int month);

    @Query(value =
        "SELECT COUNT(b.id) FROM bookings b JOIN properties p ON b.propertyId = p.id " +
        "WHERE p.user_id = :userId AND b.status NOT IN ('cancelled','canceled') " +
        "AND YEAR(b.arrival) = :year AND MONTH(b.arrival) = :month",
        nativeQuery = true)
    long countForMonth(@Param("userId") Long userId, @Param("year") int year, @Param("month") int month);

    // Reminders : bookings arriving on a specific date, not cancelled
    @Query("SELECT b FROM Booking b JOIN FETCH b.property WHERE b.arrival = :date " +
           "AND b.status NOT IN ('cancelled','canceled')")
    List<Booking> findByArrivalDate(@Param("date") LocalDate date);
}
