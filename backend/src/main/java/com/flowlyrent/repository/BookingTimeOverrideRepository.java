package com.flowlyrent.repository;

import com.flowlyrent.model.BookingTimeOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BookingTimeOverrideRepository extends JpaRepository<BookingTimeOverride, Long> {
    Optional<BookingTimeOverride> findByUserIdAndBeds24BookingId(Long userId, String beds24BookingId);
}
