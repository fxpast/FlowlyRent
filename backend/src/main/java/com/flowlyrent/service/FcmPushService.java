package com.flowlyrent.service;

import com.flowlyrent.model.FcmToken;
import com.flowlyrent.repository.FcmTokenRepository;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FcmPushService {

    @Value("${firebase.service-account-json:}")
    private String serviceAccountJson;

    private final FcmTokenRepository tokenRepo;

    private boolean enabled = false;

    @PostConstruct
    public void init() {
        if (serviceAccountJson == null || serviceAccountJson.isBlank()) {
            log.warn("FIREBASE_SERVICE_ACCOUNT_JSON non configuré — notifications FCM désactivées");
            return;
        }
        try {
            InputStream credentialsStream = new ByteArrayInputStream(
                serviceAccountJson.getBytes(StandardCharsets.UTF_8));
            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                .build();
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
            }
            enabled = true;
            log.info("FcmPushService initialisé");
        } catch (Exception e) {
            log.error("Échec init FcmPushService : {}", e.getMessage(), e);
        }
    }

    @Async
    public void sendToUser(Long userId, String title, String body, String url) {
        if (!enabled) return;
        List<FcmToken> tokens = tokenRepo.findByUserId(userId);
        if (tokens.isEmpty()) return;

        for (FcmToken fcmToken : tokens) {
            Message message = Message.builder()
                .setToken(fcmToken.getToken())
                .setNotification(Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build())
                .putData("url", url != null ? url : "")
                .build();

            try {
                FirebaseMessaging.getInstance().send(message);
                log.info("FCM envoyé userId={} : {}", userId, title);
            } catch (FirebaseMessagingException e) {
                if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED
                    || e.getMessagingErrorCode() == MessagingErrorCode.INVALID_ARGUMENT) {
                    log.info("Token FCM invalide, suppression : {}", fcmToken.getToken());
                    tokenRepo.deleteByToken(fcmToken.getToken());
                } else {
                    log.warn("FCM exception pour userId={} : {}", userId, e.getMessage());
                }
            }
        }
    }
}
