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

/**
 * Chatbot via l'API Cerebras (compatible OpenAI), utilisé en 3ème repli si Gemini ET Groq
 * sont indisponibles. Même logique de function calling que GroqChatbotService.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CerebrasChatbotService {

    private static final String API_URL = "https://api.cerebras.ai/v1/chat/completions";
    private static final int MAX_TOOL_ITERATIONS = 3;
    private static final int MAX_HISTORY_MESSAGES = 20;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ChatbotPromptService chatbotPromptService;
    private final ChatbotToolService chatbotToolService;
    private final RagService ragService;
    private final ObjectMapper objectMapper;

    @Value("${cerebras.api-key:}")
    private String apiKey;

    @Value("${cerebras.model:llama-3.3-70b}")
    private String model;

    public String ask(String question, String lang, List<Map<String, String>> history) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("L'assistant IA n'est pas configuré (Cerebras)");
        }
        if (question == null || question.isBlank()) {
            throw new IllegalArgumentException("Question vide");
        }

        String context = ragService.retrieve(question);
        String sysInstruction = context != null
                ? chatbotPromptService.systemInstruction(lang, context)
                : chatbotPromptService.systemInstruction(lang);

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", sysInstruction));
        if (history != null) {
            int start = Math.max(0, history.size() - MAX_HISTORY_MESSAGES);
            for (Map<String, String> msg : history.subList(start, history.size())) {
                String text = msg.get("text");
                if (text == null || text.isBlank()) continue;
                String role = "assistant".equals(msg.get("role")) ? "assistant" : "user";
                messages.add(Map.of("role", role, "content", text));
            }
        }
        messages.add(Map.of("role", "user", "content", question.trim()));

        try {
            for (int iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("model", model);
                body.put("messages", messages);
                body.put("tools", chatbotPromptService.openAiToolDeclarations());
                body.put("tool_choice", "auto");

                Map<String, Object> message = extractMessage(callCerebras(body));

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> toolCalls = (List<Map<String, Object>>) message.get("tool_calls");

                if (toolCalls == null || toolCalls.isEmpty()) {
                    Object content = message.get("content");
                    if (content == null || content.toString().isBlank()) {
                        throw new IllegalStateException("Réponse vide de l'assistant IA");
                    }
                    return content.toString().trim();
                }

                messages.add(message);

                for (Map<String, Object> toolCall : toolCalls) {
                    String toolCallId = (String) toolCall.get("id");
                    @SuppressWarnings("unchecked")
                    Map<String, Object> function = (Map<String, Object>) toolCall.get("function");
                    String toolName = (String) function.get("name");
                    String argumentsJson = (String) function.get("arguments");
                    Map<String, Object> args = (argumentsJson == null || argumentsJson.isBlank())
                            ? Map.of()
                            : objectMapper.readValue(argumentsJson, new TypeReference<>() {});
                    Map<String, Object> toolResult = chatbotToolService.execute(toolName, args, lang);
                    messages.add(Map.of(
                            "role", "tool",
                            "tool_call_id", toolCallId,
                            "content", objectMapper.writeValueAsString(toolResult)
                    ));
                }
            }

            throw new IllegalStateException("L'assistant IA n'a pas pu répondre");
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erreur appel Cerebras", e);
            throw new IllegalStateException("Erreur lors de l'appel à l'assistant IA");
        }
    }

    private Map<String, Object> callCerebras(Map<String, Object> body) throws Exception {
        String json = objectMapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .timeout(Duration.ofSeconds(25))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.error("Cerebras HTTP {} : {}", response.statusCode(), response.body());
            throw new IllegalStateException("Erreur de l'assistant IA");
        }

        return objectMapper.readValue(response.body(), new TypeReference<>() {});
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractMessage(Map<String, Object> result) {
        List<Map<String, Object>> choices = (List<Map<String, Object>>) result.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new IllegalStateException("Réponse vide de l'assistant IA");
        }
        return (Map<String, Object>) choices.get(0).get("message");
    }
}
