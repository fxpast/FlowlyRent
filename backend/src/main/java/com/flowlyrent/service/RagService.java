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
import java.util.AbstractMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Retrieval-Augmented Generation : indexe la base de connaissance et la FAQ en mémoire
 * (embeddings Gemini text-embedding-004) et retourne les chunks les plus pertinents pour
 * chaque question, réduisant le contexte envoyé au modèle de ~9 000 à ~2 000 tokens.
 *
 * Si la clé GEMINI_API_KEY est absente ou si l'initialisation échoue, retrieve() retourne
 * null et les services chatbot basculent en mode full-context (comportement initial).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RagService {

    private static final String EMBED_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=%s";
    private static final int TOP_KB  = 4;
    private static final int TOP_FAQ = 6;
    private static final int MAX_EMBED_CHARS = 2000;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final FaqRepository faqRepository;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api-key:}")
    private String apiKey;

    private final List<RagChunk> kbChunks = new ArrayList<>();
    private volatile List<RagChunk> faqChunks = List.of();

    private boolean ready = false;

    @PostConstruct
    public void init() {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("[RAG] GEMINI_API_KEY absent — RAG désactivé, mode full-context actif");
            return;
        }
        try {
            loadKbChunks();
            faqChunks = buildFaqChunks();
            ready = true;
            log.info("[RAG] Prêt — {} sections KB + {} entrées FAQ indexées",
                    kbChunks.size(), faqChunks.size());
        } catch (Exception e) {
            log.error("[RAG] Échec initialisation, mode full-context actif : {}", e.getMessage(), e);
        }
    }

    /**
     * Retourne le contexte pertinent pour la question (top-4 sections KB + top-6 FAQ).
     * Retourne null si RAG non disponible — l'appelant doit alors utiliser le prompt complet.
     */
    public String retrieve(String question) {
        if (!ready || question == null || question.isBlank()) return null;
        try {
            float[] qEmbed = embed(question);

            List<RagChunk> topKb  = topChunks(kbChunks,  qEmbed, TOP_KB);
            List<RagChunk> topFaq = topChunks(faqChunks, qEmbed, TOP_FAQ);

            StringBuilder sb = new StringBuilder();
            if (!topKb.isEmpty()) {
                sb.append("Base de connaissance FlowlyRent (extraits pertinents) :\n\n");
                topKb.forEach(c -> sb.append(c.text()).append("\n\n"));
            }
            if (!topFaq.isEmpty()) {
                sb.append("FAQ (extraits pertinents) :\n\n");
                topFaq.forEach(c -> sb.append(c.text()).append("\n\n"));
            }
            return sb.toString().trim();
        } catch (Exception e) {
            log.warn("[RAG] Erreur retrieve, mode full-context : {}", e.getMessage());
            return null;
        }
    }

    /** Rafraîchit les embeddings FAQ après ajout/modification d'entrées. */
    public void refreshFaq() {
        if (!ready) return;
        try {
            faqChunks = buildFaqChunks();
            log.info("[RAG] FAQ rechargée — {} entrées", faqChunks.size());
        } catch (Exception e) {
            log.error("[RAG] Échec refresh FAQ : {}", e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------

    private void loadKbChunks() throws Exception {
        String kb = new String(
                new ClassPathResource("chatbot/knowledge-base.md").getInputStream().readAllBytes(),
                StandardCharsets.UTF_8);
        for (String part : kb.split("(?m)^(?=## )")) {
            String text = part.trim();
            if (text.isBlank() || text.length() < 20) continue;
            String forEmbed = text.length() > MAX_EMBED_CHARS ? text.substring(0, MAX_EMBED_CHARS) : text;
            kbChunks.add(new RagChunk(text, embed(forEmbed)));
        }
    }

    private List<RagChunk> buildFaqChunks() throws Exception {
        List<RagChunk> chunks = new ArrayList<>();
        for (FaqItem item : faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc()) {
            if (item.getQuestion() == null || item.getAnswer() == null) continue;
            String text = "Q: " + item.getQuestion() + "\nR: " + item.getAnswer();
            chunks.add(new RagChunk(text, embed(text)));
        }
        return List.copyOf(chunks);
    }

    private float[] embed(String text) throws Exception {
        Map<String, Object> body = Map.of(
                "model", "models/text-embedding-004",
                "content", Map.of("parts", List.of(Map.of("text", text)))
        );
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(EMBED_URL.formatted(apiKey)))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("Embedding API HTTP " + response.statusCode() + " : " + response.body());
        }

        Map<String, Object> result = objectMapper.readValue(response.body(), new TypeReference<>() {});
        @SuppressWarnings("unchecked")
        Map<String, Object> embedding = (Map<String, Object>) result.get("embedding");
        @SuppressWarnings("unchecked")
        List<Number> values = (List<Number>) embedding.get("values");

        float[] arr = new float[values.size()];
        for (int i = 0; i < values.size(); i++) arr[i] = values.get(i).floatValue();
        return arr;
    }

    private List<RagChunk> topChunks(List<RagChunk> chunks, float[] query, int k) {
        return chunks.stream()
                .map(c -> new AbstractMap.SimpleEntry<>(c, cosineSimilarity(c.embedding(), query)))
                .sorted(Map.Entry.<RagChunk, Float>comparingByValue().reversed())
                .limit(k)
                .map(Map.Entry::getKey)
                .toList();
    }

    private float cosineSimilarity(float[] a, float[] b) {
        float dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot   += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        double denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom == 0 ? 0f : (float)(dot / denom);
    }

    public record RagChunk(String text, float[] embedding) {}
}
