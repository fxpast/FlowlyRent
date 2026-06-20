package com.flowlyrent.repository;

import com.flowlyrent.model.BookingMessageLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookingMessageLogRepository extends JpaRepository<BookingMessageLog, Long> {
    List<BookingMessageLog> findByUserId(Long userId);
    Optional<BookingMessageLog> findByUserIdAndPropertyIdAndType(Long userId, String propertyId, String type);
}
