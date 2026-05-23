package com.flowlyrent.controller;

import com.flowlyrent.dto.MessageDTO;
import com.flowlyrent.model.enums.SenderType;
import com.flowlyrent.service.MessageService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/messages")
@RequiredArgsConstructor
@Tag(name = "Admin - Messages")
public class AdminMessageController {

    private final MessageService messageService;

    @GetMapping("/{bookingId}")
    public List<MessageDTO> getMessages(@PathVariable Long bookingId) {
        messageService.markAsRead(bookingId, SenderType.GUEST);
        return messageService.getMessagesForBooking(bookingId);
    }

    @PostMapping("/{bookingId}")
    public ResponseEntity<MessageDTO> sendMessage(@PathVariable Long bookingId,
                                                   @Valid @RequestBody MessageDTO dto) {
        return ResponseEntity.ok(messageService.sendMessage(bookingId, dto.getContent(), SenderType.HOST));
    }

    @GetMapping("/unread-count")
    public Map<String, Long> getUnreadCount() {
        return Map.of("count", messageService.getUnreadGuestMessagesCount());
    }
}
