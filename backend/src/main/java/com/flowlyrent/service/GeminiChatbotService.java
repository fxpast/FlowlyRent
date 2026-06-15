package com.flowlyrent.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.model.FaqItem;
import com.flowlyrent.repository.FaqRepository;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiChatbotService {

    private static final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private final FaqRepository faqRepository;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String model;

    public String ask(String question, String lang) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("L'assistant IA n'est pas configuré");
        }
        if (question == null || question.isBlank()) {
            throw new IllegalArgumentException("Question vide");
        }

        String prompt = """
                Tu es l'assistant d'aide de FlowlyRent, une plateforme de gestion de location saisonnière pour les hôtes.
                Réponds à la question de l'hôte en te basant UNIQUEMENT sur la FAQ ci-dessous.
                Si la réponse ne s'y trouve pas, dis-le poliment et invite l'hôte à contacter le support.
                Réponds dans la même langue que la question, de façon concise et claire, sans formatage markdown.

                FAQ :
                %s

                Question de l'hôte : %s
                """.formatted(buildFaqContext(lang), question.trim());

        try {
            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
            );
            String json = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL.formatted(model, apiKey)))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(25))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build()
                    .send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("Gemini HTTP {} : {}", response.statusCode(), response.body());
                throw new IllegalStateException("Erreur de l'assistant IA");
            }

            Map<String, Object> result = objectMapper.readValue(response.body(), new TypeReference<>() {});
            return extractText(result);
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erreur appel Gemini", e);
            throw new IllegalStateException("Erreur lors de l'appel à l'assistant IA");
        }
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> result) {
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) result.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new IllegalStateException("Réponse vide de l'assistant IA");
        }
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        return parts.get(0).get("text").toString().trim();
    }

    private String buildFaqContext(String lang) {
        StringBuilder sb = new StringBuilder();
        for (FaqItem item : faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc()) {
            sb.append("Q: ").append(localized(lang, item.getQuestion(), item.getQuestionEn(), item.getQuestionEs(), item.getQuestionDe(), item.getQuestionIt()))
              .append("\nR: ").append(localized(lang, item.getAnswer(), item.getAnswerEn(), item.getAnswerEs(), item.getAnswerDe(), item.getAnswerIt()))
              .append("\n\n");
        }
        return sb.toString();
    }

    private String localized(String lang, String fr, String en, String es, String de, String it) {
        String value = switch (lang) {
            case "en" -> en;
            case "es" -> es;
            case "de" -> de;
            case "it" -> it;
            default -> fr;
        };
        return (value != null && !value.isBlank()) ? value : fr;
    }
}
