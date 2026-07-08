package com.flowlyrent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.repository.PropertyConfigRepository;
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
import java.util.List;
import java.util.Map;

/**
 * Email de confirmation automatique pour les réservations directes créées
 * via le site public (mode Beds24) — contenu rédigé par l'IA (Groq, même
 * fournisseur que AutoResponderService/MessageAssistService). N'a aucun lien
 * avec Beds24/les OTA : les réservations Airbnb/Booking envoient déjà leur
 * propre confirmation via leur plateforme, ce service ne concerne que les
 * réservations directes du site de l'hôte.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingConfirmationEmailService {

    private static final String GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final EmailService emailService;
    private final PropertyConfigRepository propConfigRepo;
    private final ObjectMapper objectMapper;

    @Value("${groq.api-key:}")
    private String groqApiKey;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String groqModel;

    @Async
    public void sendConfirmation(AppUser host, String propertyId, String guestFirstName, String guestEmail,
                                  String arrival, String departure, Map<String, Object> guestReward) {
        if (!emailService.isConfigured() || guestEmail == null || guestEmail.isBlank()) return;
        try {
            PropertyConfig cfg = propConfigRepo.findByUserIdAndBeds24PropertyId(host.getId(), propertyId).orElse(null);
            String propName = cfg != null && cfg.getShortName() != null && !cfg.getShortName().isBlank()
                    ? cfg.getShortName() : "votre hébergement";

            String body = generateBody(host, propName, guestFirstName, arrival, departure, guestReward);
            if (body == null) body = fallbackBody(propName, guestFirstName, arrival, departure, guestReward);

            String subject = "Confirmation de votre réservation — " + propName;
            emailService.send(guestEmail, subject, body);
        } catch (Exception e) {
            log.warn("[BookingConfirmationEmail] échec pour {} : {}", guestEmail, e.getMessage());
        }
    }

    private String generateBody(AppUser host, String propName, String guestFirstName,
                                 String arrival, String departure, Map<String, Object> guestReward) {
        if (groqApiKey == null || groqApiKey.isBlank()) return null;
        try {
            String hostName = host.getCompanyName() != null && !host.getCompanyName().isBlank()
                    ? host.getCompanyName() : (host.getFirstName() != null ? host.getFirstName() : "");

            StringBuilder userContent = new StringBuilder();
            userContent.append("Voyageur : ").append(guestFirstName != null ? guestFirstName : "").append("\n");
            userContent.append("Logement : ").append(propName).append("\n");
            userContent.append("Arrivée : ").append(arrival).append("\n");
            userContent.append("Départ : ").append(departure).append("\n");
            if (guestReward != null) {
                userContent.append("Le voyageur vient de débloquer une récompense fidélité : -")
                        .append(guestReward.get("discountPercent")).append("% avec le code ")
                        .append(guestReward.get("code"))
                        .append(" (à mentionner chaleureusement, code à usage unique pour sa prochaine réservation).\n");
            }

            String systemInstruction = "Tu rédiges un email de confirmation de réservation directe pour le compte de l'hôte « "
                    + hostName + " » (hébergement « " + propName + " »).\n"
                    + "RÈGLE ABSOLUE : réponds TOUJOURS en français, sauf indication contraire.\n"
                    + "Ton chaleureux et professionnel, format HTML simple (paragraphes <p>, pas de CSS complexe).\n"
                    + "Confirme la réservation, résume les dates, remercie le voyageur. "
                    + "Ne mentionne aucun code d'accès (transmis séparément avant l'arrivée). "
                    + "Ne prends aucun engagement financier. Réponds uniquement avec le corps HTML de l'email, sans sujet ni préambule.";

            Map<String, Object> body = Map.of(
                    "model", groqModel,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemInstruction),
                            Map.of("role", "user", "content", userContent.toString())
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
                log.warn("[BookingConfirmationEmail] Groq HTTP {} : {}", response.statusCode(), response.body());
                return null;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = objectMapper.readValue(response.body(), Map.class);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) parsed.get("choices");
            if (choices == null || choices.isEmpty()) return null;
            @SuppressWarnings("unchecked")
            Map<String, Object> msgObj = (Map<String, Object>) choices.get(0).get("message");
            String text = msgObj != null ? (String) msgObj.get("content") : null;
            return text != null && !text.isBlank() ? text : null;
        } catch (Exception e) {
            log.warn("[BookingConfirmationEmail] génération IA échouée, repli sur le modèle statique : {}", e.getMessage());
            return null;
        }
    }

    /** Repli si Groq est indisponible ou non configuré — email simple mais complet. */
    private String fallbackBody(String propName, String guestFirstName, String arrival, String departure,
                                 Map<String, Object> guestReward) {
        StringBuilder sb = new StringBuilder();
        sb.append("<p>Bonjour ").append(guestFirstName != null ? guestFirstName : "").append(",</p>");
        sb.append("<p>Votre réservation pour <strong>").append(propName).append("</strong> est confirmée.</p>");
        sb.append("<p>Arrivée : <strong>").append(arrival).append("</strong><br>");
        sb.append("Départ : <strong>").append(departure).append("</strong></p>");
        if (guestReward != null) {
            sb.append("<p>🎉 Vous débloquez -").append(guestReward.get("discountPercent"))
              .append("% sur votre prochaine réservation avec le code <strong>")
              .append(guestReward.get("code")).append("</strong> (usage unique).</p>");
        }
        sb.append("<p>Merci pour votre confiance, à bientôt !</p>");
        return sb.toString();
    }
}
