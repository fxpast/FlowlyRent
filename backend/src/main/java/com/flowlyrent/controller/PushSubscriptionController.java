package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.PushSubscription;
import com.flowlyrent.repository.PushSubscriptionRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/user/push")
@RequiredArgsConstructor
@Tag(name = "Push notifications")
public class PushSubscriptionController {

    private final PushSubscriptionRepository subRepo;
    private final SecurityUtils securityUtils;

    @Value("${vapid.public-key}")
    private String vapidPublicKey;

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody Map<String, Object> body) {
        AppUser user = securityUtils.getCurrentUser();
        String endpoint = (String) body.get("endpoint");
        if (endpoint == null || endpoint.isBlank()) return ResponseEntity.badRequest().build();

        @SuppressWarnings("unchecked")
        Map<String, String> keys = (Map<String, String>) body.get("keys");
        if (keys == null) return ResponseEntity.badRequest().build();

        subRepo.findByUserIdAndEndpoint(user.getId(), endpoint).ifPresentOrElse(
            existing -> {},
            () -> {
                PushSubscription sub = new PushSubscription();
                sub.setUser(user);
                sub.setEndpoint(endpoint);
                sub.setAuth(keys.get("auth"));
                sub.setP256dh(keys.get("p256dh"));
                subRepo.save(sub);
            }
        );
        return ResponseEntity.ok(Map.of("status", "subscribed"));
    }

    @DeleteMapping("/unsubscribe")
    public ResponseEntity<?> unsubscribe(@RequestBody Map<String, String> body) {
        String endpoint = body.get("endpoint");
        if (endpoint != null) subRepo.deleteByEndpoint(endpoint);
        return ResponseEntity.ok(Map.of("status", "unsubscribed"));
    }

    @GetMapping("/vapid-public-key")
    public ResponseEntity<?> getVapidPublicKey() {
        return ResponseEntity.ok(Map.of("publicKey", vapidPublicKey));
    }
}
