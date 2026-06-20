package com.flowlyrent.repository;

import com.flowlyrent.model.BookingMessageLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingMessageLogRepository extends JpaRepository<BookingMessageLog, Long> {
    List<BookingMessageLog> findByUserId(Long userId);
    boolean existsByUserIdAndBookingId(Long userId, String bookingId);
}
