package com.flowlyrent.repository;

import com.flowlyrent.model.GuestBookingLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GuestBookingLogRepository extends JpaRepository<GuestBookingLog, Long> {
    long countByUserIdAndGuestEmailIgnoreCase(Long userId, String guestEmail);
}
