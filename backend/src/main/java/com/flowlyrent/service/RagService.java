package com.flowlyrent.service;

import com.flowlyrent.model.FaqItem;
import com.flowlyrent.repository.FaqRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Retrieval-Augmented Generation via scoring BM25 (keyword-based).
 * Aucun appel API externe — fonctionne à zéro latence et sans dépendance d'embedding.
 *
 * Au démarrage : découpe la KB en sections ## et indexe chaque entrée FAQ.
 * À chaque requête : score les chunks par overlap de termes, retourne les top-4 sections + top-6 FAQ.
 * Réduit le contexte envoyé au modèle de ~9 000 à ~2 000 tokens.
 *
 * Si l'initialisation échoue, retrieve() retourne null → fallback mode full-context.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RagService {

    private static final int TOP_KB  = 4;
    private static final int TOP_FAQ = 6;
    private static final int MIN_CHUNK_LENGTH = 20;

    // Mots vides FR+EN supprimés avant le scoring
    private static final Set<String> STOP_WORDS = Set.of(
            "le", "la", "les", "de", "du", "des", "un", "une", "et", "en", "à", "au", "aux",
            "est", "sont", "par", "pour", "sur", "dans", "ou", "qui", "que", "ce", "se",
            "il", "elle", "ils", "elles", "je", "tu", "nous", "vous", "on",
            "the", "a", "an", "of", "to", "in", "is", "are", "for", "and", "or", "on", "at",
            "this", "that", "it", "be", "with", "as", "by", "from", "not", "but"
    );

    private final FaqRepository faqRepository;

    private List<RagChunk> kbChunks  = List.of();
    private volatile List<RagChunk> faqChunks = List.of();

    private boolean ready = false;

    @PostConstruct
    public void init() {
        try {
            kbChunks  = loadKbChunks();
            faqChunks = buildFaqChunks();
            ready = true;
            log.info("[RAG] Prêt — {} sections KB + {} entrées FAQ indexées (keyword BM25)",
                    kbChunks.size(), faqChunks.size());
        } catch (Exception e) {
            log.error("[RAG] Échec initialisation, mode full-context actif : {}", e.getMessage(), e);
        }
    }

    /**
     * Retourne le contexte pertinent pour la question (top-4 KB + top-6 FAQ).
     * Retourne null si RAG non disponible ou question vide.
     */
    public String retrieve(String question) {
        if (!ready || question == null || question.isBlank()) return null;
        try {
            Set<String> terms = tokenize(question);
            if (terms.isEmpty()) return null;

            List<RagChunk> topKb  = topChunks(kbChunks,  terms, TOP_KB);
            List<RagChunk> topFaq = topChunks(faqChunks, terms, TOP_FAQ);

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

    /** Rafraîchit l'index FAQ après ajout/modification d'entrées. */
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

    private List<RagChunk> loadKbChunks() throws Exception {
        String kb = new String(
                new ClassPathResource("chatbot/knowledge-base.md").getInputStream().readAllBytes(),
                StandardCharsets.UTF_8);
        List<RagChunk> chunks = new ArrayList<>();
        for (String part : kb.split("(?m)^(?=## )")) {
            String text = part.trim();
            if (text.isBlank() || text.length() < MIN_CHUNK_LENGTH) continue;
            chunks.add(new RagChunk(text, tokenize(text)));
        }
        return List.copyOf(chunks);
    }

    private List<RagChunk> buildFaqChunks() {
        List<RagChunk> chunks = new ArrayList<>();
        for (FaqItem item : faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc()) {
            if (item.getQuestion() == null || item.getAnswer() == null) continue;
            String text = "Q: " + item.getQuestion() + "\nR: " + item.getAnswer();
            chunks.add(new RagChunk(text, tokenize(text)));
        }
        return List.copyOf(chunks);
    }

    private List<RagChunk> topChunks(List<RagChunk> chunks, Set<String> queryTerms, int k) {
        return chunks.stream()
                .map(c -> Map.entry(c, score(queryTerms, c.terms())))
                .filter(e -> e.getValue() > 0)
                .sorted(Map.Entry.<RagChunk, Float>comparingByValue().reversed())
                .limit(k)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    /**
     * Score BM25-like : proportion des termes de la requête présents dans le chunk,
     * pondérée par la fréquence relative (termes rares = plus de poids).
     */
    private float score(Set<String> queryTerms, Set<String> docTerms) {
        long matches = queryTerms.stream().filter(docTerms::contains).count();
        return queryTerms.isEmpty() ? 0f : (float) matches / queryTerms.size();
    }

    private Set<String> tokenize(String text) {
        return Arrays.stream(text.toLowerCase().split("[^a-zA-Zàâäéèêëîïôùûüç0-9]+"))
                .filter(s -> s.length() > 2)
                .filter(s -> !STOP_WORDS.contains(s))
                .collect(Collectors.toSet());
    }

    public record RagChunk(String text, Set<String> terms) {}
}
