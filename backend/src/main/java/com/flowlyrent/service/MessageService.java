package com.flowlyrent.service;

import com.flowlyrent.dto.MessageDTO;
import com.flowlyrent.model.Booking;
import com.flowlyrent.model.Message;
import com.flowlyrent.model.enums.SenderType;
import com.flowlyrent.repository.BookingRepository;
import com.flowlyrent.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final BookingRepository bookingRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public List<MessageDTO> getMessagesForBooking(Long bookingId) {
        return messageRepository.findByBookingIdOrderByCreatedAtAsc(bookingId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public MessageDTO sendMessage(Long bookingId, String content, SenderType sender) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Réservation introuvable: " + bookingId));

        Message message = new Message();
        message.setBooking(booking);
        message.setContent(content);
        message.setSender(sender);
        message = messageRepository.save(message);

        MessageDTO dto = toDTO(message);
        // Notify via WebSocket
        messagingTemplate.convertAndSend("/topic/messages/" + bookingId, dto);

        return dto;
    }

    @Transactional
    public void markAsRead(Long bookingId, SenderType sender) {
        List<Message> messages = messageRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
        messages.stream()
                .filter(m -> m.getSender() == sender && !m.isRead())
                .forEach(m -> m.setRead(true));
        messageRepository.saveAll(messages);
    }

    public long getUnreadGuestMessagesCount() {
        return messageRepository.countByReadFalseAndSender(SenderType.GUEST);
    }

    private MessageDTO toDTO(Message m) {
        MessageDTO dto = new MessageDTO();
        dto.setId(m.getId());
        dto.setBookingId(m.getBooking().getId());
        dto.setSender(m.getSender());
        dto.setContent(m.getContent());
        dto.setRead(m.isRead());
        dto.setCreatedAt(m.getCreatedAt());
        return dto;
    }
}
