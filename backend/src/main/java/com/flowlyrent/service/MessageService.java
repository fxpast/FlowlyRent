package com.flowlyrent.service;

import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.repository.Beds24AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Messages proxiés vers Beds24 — aucun stockage local.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final Beds24ApiClient beds24;
    private final Beds24AccountRepository accountRepo;

    public List<Map<String, Object>> getMessages(Long userId, String bookingId) throws Exception {
        String token = tokenFor(userId);
        return beds24.getMessages(token, Map.of("bookingId", bookingId));
    }

    public List<Map<String, Object>> sendMessage(Long userId, String bookingId, String message) throws Exception {
        String token = tokenFor(userId);
        List<Map<String, Object>> payload = List.of(Map.of(
                "bookingId", bookingId,
                "message", message,
                "type", "host"
        ));
        return beds24.sendMessages(token, payload);
    }

    private String tokenFor(Long userId) throws Exception {
        Beds24Account account = accountRepo.findByAppUserId(userId)
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté"));
        return beds24.tokenFor(account);
    }
}
