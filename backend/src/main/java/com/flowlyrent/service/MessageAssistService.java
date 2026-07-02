package com.flowlyrent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Assistance IA pour la rédaction des messages hôte → voyageur (dialog réservation, onglet
 * Messages) : corrige/améliore un brouillon, ou suggère une réponse si le champ est vide.
 * Réutilise Groq (mêmes clés que AutoResponderService), en single-shot sans function calling.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MessageAssistService {

    private static final String GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final MessageService messageService;
    private final ObjectMapper objectMapper;

    @Value("${groq.api-key:}")
    private String groqApiKey;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String groqModel;

    public String assist(Long userId, String bookingId, String draft) throws Exception {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            throw new IllegalStateException("Assistant IA non configuré (GROQ_API_KEY manquant)");
        }

        List<Map<String, Object>> messages = messageService.getMessages(userId, bookingId);
        String history = messages.stream()
                .map(m -> ("HOST".equals(m.get("sender")) ? "Hôte" : "Voyageur") + " : " + m.getOrDefault("content", ""))
                .collect(Collectors.joining("\n"));

        boolean hasDraft = draft != null && !draft.isBlank();

        String systemInstruction = hasDraft
                ? "Tu es un assistant qui aide un hôte de location saisonnière à corriger et améliorer un message "
                + "avant de l'envoyer à un voyageur. Corrige l'orthographe et la grammaire, améliore la clarté et "
                + "le ton (professionnel et chaleureux), sans changer le sens ni la langue du texte d'origine. "
                + "Réponds uniquement avec le texte corrigé, sans commentaire, préambule ni guillemets."
                : "Tu es un assistant qui aide un hôte de location saisonnière à répondre à un voyageur. "
                + "En te basant sur l'historique de conversation fourni, rédige une réponse appropriée, "
                + "professionnelle et chaleureuse, dans la même langue que le dernier message du voyageur. "
                + "Réponds uniquement avec le texte du message, sans commentaire, préambule ni guillemets.";

        String userContent = hasDraft
                ? "Historique de la conversation :\n" + (history.isBlank() ? "(aucun message précédent)" : history)
                + "\n\nBrouillon à corriger/améliorer :\n" + draft
                : "Historique de la conversation :\n" + (history.isBlank() ? "(aucun message précédent)" : history)
                + "\n\nRédige la réponse de l'hôte au dernier message du voyageur.";

        Map<String, Object> body = Map.of(
                "model", groqModel,
                "messages", List.of(
                        Map.of("role", "system", "content", systemInstruction),
                        Map.of("role", "user",   "content", userContent)
                ),
                "max_tokens", 400,
                "temperature", hasDraft ? 0.2 : 0.5
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
            log.error("[MessageAssist] Groq HTTP {} : {}", response.statusCode(), response.body());
            throw new IllegalStateException("Erreur assistant IA");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> parsed = objectMapper.readValue(response.body(), Map.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> choices = (List<Map<String, Object>>) parsed.get("choices");
        if (choices == null || choices.isEmpty()) throw new IllegalStateException("Réponse IA vide");
        @SuppressWarnings("unchecked")
        Map<String, Object> msgObj = (Map<String, Object>) choices.get(0).get("message");
        String text = msgObj != null ? (String) msgObj.get("content") : null;
        if (text == null || text.isBlank()) throw new IllegalStateException("Réponse IA vide");
        return text.trim();
    }
}
