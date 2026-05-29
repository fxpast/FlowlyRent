package com.flowlyrent.service;

import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.repository.Beds24AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
        List<Map<String, Object>> raw = beds24.getMessages(token, Map.of("bookingId", bookingId));
        return raw.stream().map(m -> {
            Map<String, Object> out = new HashMap<>(m);
            out.put("content",   m.getOrDefault("message", ""));
            out.put("createdAt", m.getOrDefault("time", ""));
            String source = String.valueOf(m.getOrDefault("source", "guest")).toLowerCase();
            out.put("sender", source.equals("host") ? "HOST" : "GUEST");
            return out;
        }).collect(Collectors.toList());
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
