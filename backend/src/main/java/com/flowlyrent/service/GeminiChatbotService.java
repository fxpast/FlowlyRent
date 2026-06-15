package com.flowlyrent.service;

import com.fasterxml.jackson.core.type.TypeReference;
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

    private final ChatbotPromptService chatbotPromptService;
    private final ChatbotToolService chatbotToolService;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.0-flash}")
    private String model;

    public String ask(String question, String lang, List<Map<String, String>> history) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("L'assistant IA n'est pas configuré");
        }
        if (question == null || question.isBlank()) {
            throw new IllegalArgumentException("Question vide");
        }

        String systemInstruction = chatbotPromptService.systemInstruction(lang);

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
                body.put("tools", List.of(Map.of("functionDeclarations", chatbotPromptService.geminiToolDeclarations())));

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
                    Map<String, Object> toolResult = chatbotToolService.execute(toolName, args, lang);
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
}
