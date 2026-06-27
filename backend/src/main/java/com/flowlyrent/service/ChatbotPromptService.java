package com.flowlyrent.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.model.FaqItem;
import com.flowlyrent.repository.FaqRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Construit le system instruction (base de connaissance + FAQ + consignes) et les
 * déclarations d'outils du chatbot, partagés entre les différents fournisseurs IA
 * (Gemini, Groq...).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotPromptService {

    private final FaqRepository faqRepository;
    private final ObjectMapper objectMapper;

    private String knowledgeBase = "";
    private List<Map<String, Object>> geminiToolDeclarations = List.of();
    private List<Map<String, Object>> openAiToolDeclarations = List.of();

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
            geminiToolDeclarations = objectMapper.readValue(json, new TypeReference<>() {});
            openAiToolDeclarations = toOpenAiTools(geminiToolDeclarations);
        } catch (Exception e) {
            log.error("Impossible de charger les déclarations d'outils du chatbot", e);
        }
    }

    /** Déclarations d'outils au format Gemini ({@code functionDeclarations}, types en MAJUSCULES). */
    public List<Map<String, Object>> geminiToolDeclarations() {
        return geminiToolDeclarations;
    }

    /** Déclarations d'outils au format OpenAI/Groq ({@code tools}, types en minuscules, JSON Schema standard). */
    public List<Map<String, Object>> openAiToolDeclarations() {
        return openAiToolDeclarations;
    }

    /** Mode full-context : envoie toute la base de connaissance + toute la FAQ (fallback si RAG indisponible). */
    public String systemInstruction(String lang) {
        return buildInstruction(LocalDate.now().toString(),
                "Base de connaissance FlowlyRent :\n" + knowledgeBase + "\n\nFAQ :\n" + buildFaqContext(lang));
    }

    /** Mode RAG : envoie uniquement les chunks pertinents récupérés par RagService. */
    public String systemInstruction(String lang, String retrievedContext) {
        return buildInstruction(LocalDate.now().toString(), retrievedContext);
    }

    private String buildInstruction(String date, String context) {
        return """
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

                Si une question porte sur le fonctionnement de FlowlyRent et que la réponse ne se trouve ni dans la
                base de connaissance, ni dans la FAQ, tu DOIS appeler l'outil suggest_faq (avec la question de
                l'hôte, et une proposition de réponse si tu en as une fiable, sinon laisse "answer" vide) AVANT de
                répondre à l'hôte — c'est une étape obligatoire, pas une simple description. Ce n'est qu'une fois
                cet outil exécuté que tu informes poliment l'hôte que sa question a été transmise à l'équipe
                FlowlyRent pour être ajoutée à la FAQ. Ne dis JAMAIS à l'hôte que sa question sera transmise si tu
                n'as pas réellement appelé suggest_faq dans ce même échange.
                Si une question ou une demande porte sur les données de l'hôte (revenus par prestataire, analyse
                sur plusieurs années, modification d'une réservation, envoi de message, etc.) mais qu'aucun outil
                ne permet d'y répondre, tu DOIS appeler report_unhandled_action (paramètre "action" = description
                claire de ce que l'hôte voulait savoir ou faire, "userMessage" = message original de l'hôte)
                AVANT de répondre poliment. Ne jamais mentionner que la demande a été enregistrée si tu n'as pas
                réellement appelé report_unhandled_action dans ce même échange.
                Réponds dans la même langue que la question, de façon concise et claire, sans formatage markdown.

                Date du jour : %s

                %s
                """.formatted(date, context);
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

    /**
     * Convertit les déclarations d'outils du format Gemini (types {@code OBJECT}/{@code STRING}/...)
     * vers le format OpenAI/Groq ({@code {"type": "function", "function": {...}}}, types en minuscules).
     */
    private List<Map<String, Object>> toOpenAiTools(List<Map<String, Object>> geminiDecls) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> decl : geminiDecls) {
            Map<String, Object> function = new LinkedHashMap<>();
            function.put("name", decl.get("name"));
            function.put("description", decl.get("description"));
            @SuppressWarnings("unchecked")
            Map<String, Object> parameters = (Map<String, Object>) decl.get("parameters");
            function.put("parameters", convertSchema(parameters));
            result.add(Map.of("type", "function", "function", function));
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> convertSchema(Map<String, Object> schema) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : schema.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            if ("type".equals(key) && value instanceof String s) {
                result.put("type", s.toLowerCase());
            } else if ("properties".equals(key) && value instanceof Map<?, ?> props) {
                Map<String, Object> converted = new LinkedHashMap<>();
                for (var e : props.entrySet()) {
                    converted.put((String) e.getKey(), convertSchema((Map<String, Object>) e.getValue()));
                }
                result.put("properties", converted);
            } else {
                result.put(key, value);
            }
        }
        return result;
    }
}
