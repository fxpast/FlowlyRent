package com.flowlyrent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.model.*;
import com.flowlyrent.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Répondeur automatique aux messages voyageurs entrants (Beds24).
 *
 * Flux :
 *   webhook Beds24 → processMessage()
 *     → classify() : SIMPLE ou SENSITIVE (mots-clés)
 *     → SIMPLE  : génère une réponse via Groq + envoie via Beds24
 *     → SENSITIVE : envoie le message transitoire + notifie l'hôte (push + AdminNotification)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AutoResponderService {

    private static final String GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /** Mots-clés sensibles par défaut si l'hôte n'en a pas configuré. */
    private static final List<String> DEFAULT_SENSITIVE_KEYWORDS = List.of(
            "urgence", "urgent", "fuite", "inondation", "panne", "électricité", "eau",
            "remboursement", "rembours", "annulation", "annuler", "plainte",
            "incident", "dangereux", "blessé", "blessure", "police", "pompier",
            "ambulance", "accident", "incendie", "vol", "cambriolage",
            "emergency", "urgent", "leak", "flood", "broken", "damage",
            "refund", "cancel", "complaint", "danger", "injured", "fire", "theft"
    );

    private final AutoResponderConfigRepository configRepo;
    private final AutoResponderLogRepository logRepo;
    private final Beds24AccountRepository accountRepo;
    private final Beds24ApiClient beds24;
    private final PropertyConfigRepository propConfigRepo;
    private final FaqRepository faqRepo;
    private final WebPushService webPushService;
    private final AdminNotificationRepository notifRepo;
    private final AppUserRepository userRepo;
    private final ObjectMapper objectMapper;

    @Value("${groq.api-key:}")
    private String groqApiKey;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String groqModel;

    // ─── Point d'entrée (appelé depuis le webhook Beds24) ─────────────────────

    @Async
    public void processMessage(Long userId, String beds24MessageId, String bookingId,
                                String propertyId, String guestMessage) {
        if (beds24MessageId == null || guestMessage == null || guestMessage.isBlank()) return;

        // Déduplication
        if (logRepo.existsByUserIdAndBeds24MessageId(userId, beds24MessageId)) {
            log.debug("[AutoResponder] userId={} messageId={} déjà traité", userId, beds24MessageId);
            return;
        }

        AutoResponderConfig config = configRepo.findByUserId(userId).orElse(null);
        if (config == null || !config.isEnabled()) {
            log.debug("[AutoResponder] userId={} désactivé ou non configuré", userId);
            return;
        }

        String classification = classify(guestMessage, config.getSensitiveKeywords());
        boolean autoReplied = false;

        try {
            if ("SIMPLE".equals(classification)) {
                String reply = generateReply(userId, bookingId, propertyId, guestMessage, config);
                if (reply != null && !reply.isBlank()) {
                    sendMessage(userId, bookingId, reply);
                    autoReplied = true;
                    log.info("[AutoResponder] userId={} bookingId={} → réponse SIMPLE envoyée", userId, bookingId);
                }
            } else {
                String transitional = config.getTransitionalMessage();
                if (transitional == null || transitional.isBlank()) {
                    transitional = "Merci pour votre message. Votre hôte a été notifié et vous répondra dans les meilleurs délais.";
                }
                sendMessage(userId, bookingId, transitional);
                autoReplied = true;
                notifyHost(userId, bookingId, guestMessage);
                log.info("[AutoResponder] userId={} bookingId={} → cas SENSIBLE, hôte notifié", userId, bookingId);
            }
        } catch (Exception e) {
            log.error("[AutoResponder] userId={} bookingId={} — erreur : {}", userId, bookingId, e.getMessage(), e);
        }

        saveLog(userId, beds24MessageId, bookingId, propertyId, classification, autoReplied, guestMessage);
    }

    // ─── Classification ───────────────────────────────────────────────────────

    public String classify(String message, String configKeywords) {
        String lower = message.toLowerCase();
        List<String> keywords = (configKeywords != null && !configKeywords.isBlank())
                ? Arrays.stream(configKeywords.split(",")).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList())
                : DEFAULT_SENSITIVE_KEYWORDS;
        for (String kw : keywords) {
            if (lower.contains(kw.toLowerCase())) return "SENSITIVE";
        }
        return "SIMPLE";
    }

    // ─── Génération de réponse IA ─────────────────────────────────────────────

    private String generateReply(Long userId, String bookingId, String propertyId,
                                  String guestMessage, AutoResponderConfig config) throws Exception {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            log.warn("[AutoResponder] GROQ_API_KEY non configuré — impossible de générer une réponse");
            return null;
        }

        String token = tokenFor(userId);

        // Contexte réservation
        String bookingContext = buildBookingContext(token, bookingId);

        // Historique messages (5 derniers)
        String messageHistory = buildMessageHistory(token, bookingId);

        // Infos logement
        PropertyConfig propConfig = propConfigRepo.findByUserIdAndBeds24PropertyId(userId, propertyId).orElse(null);
        String propName   = propConfig != null && propConfig.getShortName() != null ? propConfig.getShortName() : "l'hébergement";
        String accessCode = propConfig != null && propConfig.getAccessCode()  != null ? propConfig.getAccessCode()  : "(non défini)";
        String propKnowledgeBase = propConfig != null ? propConfig.getKnowledgeBaseExtra() : null;

        // FAQ (8 premières questions/réponses)
        String faqContext = faqRepo.findAllByOrderByDisplayOrderAscCreatedAtAsc().stream()
                .limit(8)
                .map(f -> "Q : " + f.getQuestion() + "\nR : " + f.getAnswer())
                .collect(Collectors.joining("\n\n"));

        String systemInstruction = buildSystemInstruction(propName, accessCode, bookingContext, faqContext,
                propKnowledgeBase, config.getSystemPromptExtra());

        // Appel Groq (single-shot, sans function calling)
        Map<String, Object> body = Map.of(
                "model", groqModel,
                "messages", List.of(
                        Map.of("role", "system", "content", systemInstruction),
                        Map.of("role", "user",   "content", messageHistory + "\n\n[NOUVEAU MESSAGE VOYAGEUR] " + guestMessage)
                ),
                "max_tokens", 400,
                "temperature", 0.4
        );

        String requestBody = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_API))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + groqApiKey)
                .timeout(Duration.ofSeconds(25))
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            log.error("[AutoResponder] Groq HTTP {} : {}", response.statusCode(), response.body());
            return null;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> parsed = objectMapper.readValue(response.body(), Map.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> choices = (List<Map<String, Object>>) parsed.get("choices");
        if (choices == null || choices.isEmpty()) return null;
        @SuppressWarnings("unchecked")
        Map<String, Object> msgObj = (Map<String, Object>) choices.get(0).get("message");
        return msgObj != null ? (String) msgObj.get("content") : null;
    }

    private String buildSystemInstruction(String propName, String accessCode, String bookingContext,
                                           String faqContext, String propKnowledgeBase, String extraPrompt) {
        StringBuilder sb = new StringBuilder();
        sb.append("Tu es l'assistant automatique du propriétaire de l'hébergement « ").append(propName).append(" ».\n");
        sb.append("Tu réponds aux messages des voyageurs de manière chaleureuse, professionnelle et concise.\n");
        sb.append("RÈGLE ABSOLUE : réponds TOUJOURS dans la même langue que le voyageur.\n");
        sb.append("Ne prends jamais d'engagement financier ni ne promets de remboursement.\n\n");

        if (!bookingContext.isBlank()) {
            sb.append("=== CONTEXTE DU SÉJOUR ===\n").append(bookingContext).append("\n\n");
        }
        sb.append("Code d'accès : ").append(accessCode).append("\n\n");

        if (!faqContext.isBlank()) {
            sb.append("=== FAQ (utilise ces informations si pertinentes) ===\n").append(faqContext).append("\n\n");
        }

        if (propKnowledgeBase != null && !propKnowledgeBase.isBlank()) {
            sb.append("=== INFOS SPÉCIFIQUES AU LOGEMENT « ").append(propName).append(" » ===\n")
              .append(propKnowledgeBase).append("\n\n");
        }

        if (extraPrompt != null && !extraPrompt.isBlank()) {
            sb.append("=== INSTRUCTIONS SUPPLÉMENTAIRES DE L'HÔTE ===\n").append(extraPrompt).append("\n\n");
        }

        sb.append("Réponds directement sans préambule. Sois utile et bref.");
        return sb.toString();
    }

    private String buildBookingContext(String token, String bookingId) {
        try {
            List<Map<String, Object>> bookings = beds24.getBookings(token, Map.of("id", bookingId));
            if (bookings.isEmpty()) return "";
            Map<String, Object> b = bookings.get(0);
            return String.format("Voyageur : %s %s — Arrivée : %s — Départ : %s — Adultes : %s — Enfants : %s",
                    b.getOrDefault("firstName", ""), b.getOrDefault("lastName", ""),
                    b.getOrDefault("arrival", "?"), b.getOrDefault("departure", "?"),
                    b.getOrDefault("numAdult", "?"), b.getOrDefault("numChild", "0"));
        } catch (Exception e) {
            log.debug("[AutoResponder] buildBookingContext error : {}", e.getMessage());
            return "";
        }
    }

    private String buildMessageHistory(String token, String bookingId) {
        try {
            List<Map<String, Object>> messages = beds24.getMessages(token, Map.of("bookingId", bookingId));
            return messages.stream()
                    .skip(Math.max(0, messages.size() - 5))
                    .map(m -> {
                        String src = String.valueOf(m.getOrDefault("source", "guest")).toLowerCase();
                        String role = src.equals("host") ? "[HÔTE]" : "[VOYAGEUR]";
                        return role + " " + m.getOrDefault("message", "");
                    })
                    .collect(Collectors.joining("\n"));
        } catch (Exception e) {
            return "";
        }
    }

    // ─── Envoi du message ─────────────────────────────────────────────────────

    private void sendMessage(Long userId, String bookingId, String text) throws Exception {
        String token = tokenFor(userId);
        beds24.sendMessages(token, List.of(Map.of(
                "bookingId", bookingId,
                "message",   text,
                "type",      "host"
        )));
    }

    // ─── Notification hôte (cas sensible) ────────────────────────────────────

    private void notifyHost(Long userId, String bookingId, String guestMessage) {
        String excerpt = guestMessage.length() > 200 ? guestMessage.substring(0, 200) + "…" : guestMessage;

        // Push web
        webPushService.sendToUser(userId,
                "⚠️ Message voyageur — intervention requise",
                "Réservation " + bookingId + " : " + excerpt,
                "/admin/messages");

        // Notification in-app
        try {
            AppUser user = userRepo.findById(userId).orElse(null);
            if (user != null) {
                AdminNotification notif = new AdminNotification();
                notif.setSubject("⚠️ Réponse manuelle requise — réservation " + bookingId);
                notif.setContent("Un message voyageur a été détecté comme sensible et requiert une réponse manuelle.\n\n" + excerpt);
                notif.getTargetUsers().add(user);
                notifRepo.save(notif);
            }
        } catch (Exception e) {
            log.warn("[AutoResponder] impossible de créer la AdminNotification : {}", e.getMessage());
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private String tokenFor(Long userId) throws Exception {
        Beds24Account account = accountRepo.findByAppUserId(userId)
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté (userId=" + userId + ")"));
        return beds24.tokenFor(account);
    }

    private void saveLog(Long userId, String beds24MessageId, String bookingId, String propertyId,
                          String classification, boolean autoReplied, String guestMessage) {
        try {
            AutoResponderLog l = new AutoResponderLog();
            l.setUserId(userId);
            l.setBeds24MessageId(beds24MessageId);
            l.setBookingId(bookingId);
            l.setPropertyId(propertyId);
            l.setClassification(classification);
            l.setAutoReplied(autoReplied);
            l.setGuestMessageExcerpt(guestMessage != null && guestMessage.length() > 500
                    ? guestMessage.substring(0, 500) : guestMessage);
            logRepo.save(l);
        } catch (Exception e) {
            log.warn("[AutoResponder] saveLog error : {}", e.getMessage());
        }
    }

    // ─── Mode test (aucun envoi, aucun log) ──────────────────────────────────

    public Map<String, Object> testMessage(Long userId, String message, String bookingId, String propertyId) {
        AutoResponderConfig config = getOrCreateConfig(userId);
        String classification = classify(message, config.getSensitiveKeywords());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("classification", classification);

        if ("SIMPLE".equals(classification)) {
            try {
                String reply = generateReply(userId,
                        bookingId != null && !bookingId.isBlank() ? bookingId : null,
                        propertyId, message, config);
                result.put("generatedReply", reply != null ? reply : "(aucune réponse générée — vérifiez GROQ_API_KEY)");
            } catch (Exception e) {
                result.put("generatedReply", "(erreur génération IA : " + e.getMessage() + ")");
            }
        } else {
            String transitional = config.getTransitionalMessage();
            if (transitional == null || transitional.isBlank()) {
                transitional = "Merci pour votre message. Votre hôte a été notifié et vous répondra dans les meilleurs délais.";
            }
            result.put("transitionalMessage", transitional);
            result.put("hostAlert", "Une notification push aurait été envoyée à l'hôte.");
        }
        return result;
    }

    // ─── API publique pour le contrôleur ─────────────────────────────────────

    public AutoResponderConfig getOrCreateConfig(Long userId) {
        return configRepo.findByUserId(userId).orElseGet(() -> {
            AutoResponderConfig c = new AutoResponderConfig();
            c.setUserId(userId);
            return c;
        });
    }

    public AutoResponderConfig saveConfig(AutoResponderConfig config) {
        return configRepo.save(config);
    }

    public List<AutoResponderLog> getLogs(Long userId) {
        return logRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<String> getDefaultSensitiveKeywords() {
        return DEFAULT_SENSITIVE_KEYWORDS;
    }
}
