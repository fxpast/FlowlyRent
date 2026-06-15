package com.flowlyrent.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.model.FaqItem;
import com.flowlyrent.repository.FaqRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiChatbotService {

    private static final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";
    private static final int MAX_TOOL_ITERATIONS = 3;
    private static final int MAX_HISTORY_MESSAGES = 20;

    private final FaqRepository faqRepository;
    private final ChatbotToolService chatbotToolService;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String model;

    private String knowledgeBase = "";
    private List<Map<String, Object>> toolDeclarations = List.of();

    @PostConstruct
    public void loadKnowledgeBase() {
        try {
            knowledgeBase = new String(
                    new ClassPathResource("chatbot/knowledge-base.md").getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Impossible de charger la base de connaissance FlowlyRent", e);
        }
    }

    @PostConstruct
    public void loadToolDeclarations() {
        try {
            String json = new String(
                    new ClassPathResource("chatbot/tool-declarations.json").getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8);
            toolDeclarations = objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.error("Impossible de charger les déclarations d'outils du chatbot", e);
        }
    }

    public String ask(String question, String lang, List<Map<String, String>> history) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("L'assistant IA n'est pas configuré");
        }
        if (question == null || question.isBlank()) {
            throw new IllegalArgumentException("Question vide");
        }

        String systemInstruction = """
                Tu es l'assistant d'aide de FlowlyRent, une plateforme de gestion de location saisonnière pour les hôtes.

                Pour toute question sur le fonctionnement de l'application, base-toi UNIQUEMENT sur la base de
                connaissance et la FAQ ci-dessous.

                Pour toute question portant sur les données réelles de l'hôte (revenus, marge, réservations,
                arrivées, départs, séjours en cours, dépenses, ménage, stock de linge, etc.), utilise les outils mis
                à ta disposition plutôt que la base de connaissance. Résous les dates ou périodes relatives
                ("aujourd'hui", "demain", "hier", "ce mois-ci", "le mois dernier") en dates absolues (AAAA-MM-JJ) ou
                en année/mois avant d'appeler un outil, en te basant sur la date du jour ci-dessous.

                Certains outils effectuent une ACTION D'ÉCRITURE qui modifie le calendrier du logement sur Beds24 et
                sur toutes les plateformes connectées (Airbnb, Booking.com, etc.) : block_dates (bloquer des dates)
                et unblock_dates (débloquer des dates). Pour ces outils, tu dois OBLIGATOIREMENT :
                1. D'abord répondre par un texte qui récapitule clairement l'action envisagée (logement concerné et
                   dates précises au format AAAA-MM-JJ) et demander explicitement à l'hôte de confirmer, SANS
                   appeler l'outil.
                2. N'appeler block_dates ou unblock_dates que si le dernier message de l'hôte confirme explicitement
                   l'action proposée (ex: "oui", "confirme", "vas-y", "d'accord").
                3. Si l'hôte refuse ou ne confirme pas clairement, ne pas appeler l'outil et rester en attente.

                Si une information ne se trouve ni dans la base de connaissance, ni dans la FAQ, ni dans les outils,
                dis-le poliment et invite l'hôte à contacter le support.
                Réponds dans la même langue que la question, de façon concise et claire, sans formatage markdown.

                Date du jour : %s

                Base de connaissance FlowlyRent :
                %s

                FAQ :
                %s
                """.formatted(LocalDate.now(), knowledgeBase, buildFaqContext(lang));

        List<Map<String, Object>> contents = new ArrayList<>();
        if (history != null) {
            int start = Math.max(0, history.size() - MAX_HISTORY_MESSAGES);
            for (Map<String, String> msg : history.subList(start, history.size())) {
                String text = msg.get("text");
                if (text == null || text.isBlank()) continue;
                String role = "assistant".equals(msg.get("role")) ? "model" : "user";
                contents.add(Map.of("role", role, "parts", List.of(Map.of("text", text))));
            }
        }
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", question.trim()))));

        try {
            for (int iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("system_instruction", Map.of("parts", List.of(Map.of("text", systemInstruction))));
                body.put("contents", contents);
                body.put("tools", List.of(Map.of("functionDeclarations", toolDeclarations)));

                Map<String, Object> content = extractContent(callGemini(body));

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");

                List<Map<String, Object>> functionCalls = new ArrayList<>();
                StringBuilder textBuilder = new StringBuilder();
                for (Map<String, Object> part : parts) {
                    if (part.get("functionCall") != null) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> functionCall = (Map<String, Object>) part.get("functionCall");
                        functionCalls.add(functionCall);
                    } else if (part.get("text") != null) {
                        textBuilder.append(part.get("text"));
                    }
                }

                if (functionCalls.isEmpty()) {
                    if (textBuilder.length() == 0) {
                        throw new IllegalStateException("Réponse vide de l'assistant IA");
                    }
                    return textBuilder.toString().trim();
                }

                List<Map<String, Object>> modelParts = new ArrayList<>();
                for (Map<String, Object> functionCall : functionCalls) {
                    modelParts.add(Map.of("functionCall", functionCall));
                }
                contents.add(Map.of("role", "model", "parts", modelParts));

                List<Map<String, Object>> responseParts = new ArrayList<>();
                for (Map<String, Object> functionCall : functionCalls) {
                    String toolName = (String) functionCall.get("name");
                    @SuppressWarnings("unchecked")
                    Map<String, Object> args = (Map<String, Object>) functionCall.get("args");
                    Map<String, Object> toolResult = chatbotToolService.execute(toolName, args);
                    responseParts.add(Map.of("functionResponse", Map.of("name", toolName, "response", toolResult)));
                }
                contents.add(Map.of("role", "user", "parts", responseParts));
            }

            throw new IllegalStateException("L'assistant IA n'a pas pu répondre");
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erreur appel Gemini", e);
            throw new IllegalStateException("Erreur lors de l'appel à l'assistant IA");
        }
    }

    private Map<String, Object> callGemini(Map<String, Object> body) throws Exception {
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

        return objectMapper.readValue(response.body(), new TypeReference<>() {});
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractContent(Map<String, Object> result) {
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) result.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new IllegalStateException("Réponse vide de l'assistant IA");
        }
        return (Map<String, Object>) candidates.get(0).get("content");
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
