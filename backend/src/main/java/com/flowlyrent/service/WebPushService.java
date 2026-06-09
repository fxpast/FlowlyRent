package com.flowlyrent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.model.PushSubscription;
import com.flowlyrent.repository.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.security.Security;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebPushService {

    @Value("${vapid.public-key}")
    private String publicKey;

    @Value("${vapid.private-key:}")
    private String privateKey;

    @Value("${vapid.subject}")
    private String subject;

    private final PushSubscriptionRepository subRepo;
    private final ObjectMapper objectMapper;

    private PushService pushService;

    @PostConstruct
    public void init() {
        Security.addProvider(new BouncyCastleProvider());
        if (privateKey != null && !privateKey.isBlank()) {
            try {
                pushService = new PushService(publicKey, privateKey, subject);
                log.info("WebPushService initialisé avec VAPID");
            } catch (Exception e) {
                log.error("Échec init WebPushService : {}", e.getMessage(), e);
            }
        } else {
            log.warn("VAPID_PRIVATE_KEY non configuré — push désactivé");
        }
    }

    @Async
    public void sendToUser(Long userId, String title, String body, String url) {
        if (pushService == null) return;
        List<PushSubscription> subs = subRepo.findByUserId(userId);
        if (subs.isEmpty()) return;

        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                "notification", Map.of(
                    "title", title,
                    "body",  body,
                    "icon",  "/assets/logo.svg",
                    "badge", "/assets/logo.svg",
                    "data",  Map.of("url", url),
                    "vibrate", new int[]{200, 100, 200}
                )
            ));

            for (PushSubscription sub : subs) {
                try {
                    Notification notification = new Notification(
                        sub.getEndpoint(),
                        sub.getP256dh(),
                        sub.getAuth(),
                        payload.getBytes()
                    );
                    pushService.send(notification);
                } catch (Exception e) {
                    log.warn("Push échoué pour endpoint {} : {}", sub.getEndpoint(), e.getMessage());
                    if (e.getMessage() != null && e.getMessage().contains("410")) {
                        subRepo.deleteByEndpoint(sub.getEndpoint());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Erreur sérialisation payload push : {}", e.getMessage(), e);
        }
    }
}
