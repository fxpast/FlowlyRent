package com.flowlyrent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.model.AutoResponderConfig;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.repository.AutoResponderConfigRepository;
import com.flowlyrent.repository.FaqRepository;
import com.flowlyrent.repository.PropertyConfigRepository;
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
 * Réutilise Groq et la configuration du répondeur automatique (AutoResponderConfig.systemPromptExtra,
 * infos logement, FAQ) pour rester cohérent avec le ton et les instructions déjà définis par l'hôte —
 * mais reste manuel : le texte généré ne remplace que le brouillon, jamais envoyé automatiquement.
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
    private final AutoResponderConfigRepository autoResponderConfigRepo;
    private final PropertyConfigRepository propertyConfigRepo;
    private final FaqRepository faqRepo;
    private final ObjectMapper objectMapper;

    @Value("${groq.api-key:}")
    private String groqApiKey;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String groqModel;

    public String assist(Long userId, String bookingId, String propertyId, String draft,
                          String bookingContext) throws Exception {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            throw new IllegalStateException("Assistant IA non configuré (GROQ_API_KEY manquant)");
        }

        List<Map<String, Object>> messages = messageService.getMessages(userId, bookingId);
        String history = messages.stream()
                .map(m -> ("HOST".equals(m.get("sender")) ? "Hôte" : "Voyageur") + " : " + m.getOrDefault("content", ""))
                .collect(Collectors.joining("\n"));

        AutoResponderConfig config = autoResponderConfigRepo.findByUserId(userId).orElse(null);
        String extraPrompt = config != null ? config.getSystemPromptExtra() : null;

        PropertyConfig propConfig = propertyId != null && !propertyId.isBlank()
                ? propertyConfigRepo.findByUserIdAndBeds24PropertyId(userId, propertyId).orElse(null)
                : null;
        String propName   = propConfig != null && propConfig.getShortName() != null ? propConfig.getShortName() : "l'hébergement";
        String accessCode = propConfig != null && propConfig.getAccessCode()  != null ? propConfig.getAccessCode()  : "(non défini)";
        String propKnowledgeBase = propConfig != null ? propConfig.getKnowledgeBaseExtra() : null;

        String faqContext = faqRepo.findAllByOrderByDisplayOrderAscCreatedAtAsc().stream()
                .limit(8)
                .map(f -> "Q : " + f.getQuestion() + "\nR : " + f.getAnswer())
                .collect(Collectors.joining("\n\n"));

        boolean hasDraft = draft != null && !draft.isBlank();

        String systemInstruction = buildSystemInstruction(hasDraft, propName, accessCode,
                bookingContext, faqContext, propKnowledgeBase, extraPrompt);

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

    private String buildSystemInstruction(boolean hasDraft, String propName, String accessCode,
                                           String bookingContext, String faqContext,
                                           String propKnowledgeBase, String extraPrompt) {
        StringBuilder sb = new StringBuilder();
        sb.append("Tu es l'assistant de rédaction de l'hôte de l'hébergement « ").append(propName).append(" ».\n");
        sb.append(hasDraft
                ? "L'hôte a rédigé un brouillon de réponse à un voyageur. Corrige l'orthographe et la grammaire, "
                + "améliore la clarté et le ton (professionnel et chaleureux), sans changer le sens ni la langue "
                + "du texte d'origine.\n"
                : "L'hôte souhaite répondre à un voyageur mais n'a encore rien écrit. En te basant sur l'historique "
                + "de conversation, rédige une réponse appropriée, professionnelle et chaleureuse, dans la même "
                + "langue que le dernier message du voyageur.\n");
        sb.append("RÈGLE ABSOLUE : réponds TOUJOURS dans la même langue que le voyageur (ou celle du brouillon).\n");
        sb.append("Ne prends jamais d'engagement financier ni ne promets de remboursement.\n\n");

        if (bookingContext != null && !bookingContext.isBlank()) {
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
            sb.append("=== INSTRUCTIONS SUPPLÉMENTAIRES DE L'HÔTE (Répondeur automatique) ===\n")
                    .append(extraPrompt).append("\n\n");
        }

        sb.append("Réponds uniquement avec le texte du message, sans commentaire, préambule ni guillemets.");
        return sb.toString();
    }
}
