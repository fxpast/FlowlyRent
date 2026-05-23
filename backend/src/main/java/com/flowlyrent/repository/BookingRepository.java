package com.flowlyrent.repository;

import com.flowlyrent.model.Booking;
import com.flowlyrent.model.enums.BookingSource;
import com.flowlyrent.model.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByCheckInBetweenAndStatusNot(LocalDate from, LocalDate to, BookingStatus status);

    List<Booking> findByCheckOutBetweenAndStatusNot(LocalDate from, LocalDate to, BookingStatus status);

    Optional<Booking> findByExternalId(String externalId);

    boolean existsByExternalId(String externalId);

    Page<Booking> findByStatusIn(List<BookingStatus> statuses, Pageable pageable);

    @Query("SELECT b FROM Booking b WHERE b.property.id = :propertyId AND b.status != 'CANCELLED' " +
           "AND ((b.checkIn <= :checkOut AND b.checkOut >= :checkIn))")
    List<Booking> findConflictingBookings(@Param("propertyId") Long propertyId,
                                          @Param("checkIn") LocalDate checkIn,
                                          @Param("checkOut") LocalDate checkOut);

    List<Booking> findBySourceAndExternalIdIn(BookingSource source, List<String> externalIds);

    @Query("SELECT b FROM Booking b JOIN FETCH b.guest JOIN FETCH b.property ORDER BY b.createdAt DESC")
    List<Booking> findAllWithDetails();
}
