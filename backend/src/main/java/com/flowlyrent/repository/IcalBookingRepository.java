package com.flowlyrent.repository;

import com.flowlyrent.model.IcalBooking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface IcalBookingRepository extends JpaRepository<IcalBooking, Long> {
    List<IcalBooking> findByUserId(Long userId);
    List<IcalBooking> findByLocalPropertyId(Long propertyId);
    Optional<IcalBooking> findByLocalPropertyIdAndIcalUid(Long propertyId, String uid);
    List<IcalBooking> findByUserIdAndArrivalBetween(Long userId, LocalDate from, LocalDate to);
    List<IcalBooking> findByUserIdAndDepartureBetween(Long userId, LocalDate from, LocalDate to);
    List<IcalBooking> findByUserIdAndArrivalLessThanAndDepartureGreaterThan(Long userId, LocalDate before, LocalDate after);
    void deleteByLocalPropertyIdAndIcalUidNotIn(Long propertyId, Set<String> uids);
    void deleteByLocalPropertyId(Long propertyId);
}
