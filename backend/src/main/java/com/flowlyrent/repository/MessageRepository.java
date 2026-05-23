package com.flowlyrent.repository;

import com.flowlyrent.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByBookingIdOrderByCreatedAtAsc(Long bookingId);
    long countByBookingIdAndReadFalseAndSenderIn(Long bookingId, List<com.flowlyrent.model.enums.SenderType> senders);
    long countByReadFalseAndSender(com.flowlyrent.model.enums.SenderType sender);
}
