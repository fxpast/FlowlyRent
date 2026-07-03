package com.flowlyrent.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.model.ConciergeConfig;
import com.flowlyrent.repository.ConciergeConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Traduction automatique du contenu de la page publique Conciergerie — même service
 * (MyMemory) et même principe async que FaqTranslationService, mais sur un bundle de
 * contenu plus riche (hero, pitch, services, stats, étapes, tarification, témoignages).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConciergeTranslationService {

    private static final List<String> LANGS = List.of("en", "es", "de", "it");

    private final ConciergeConfigRepository configRepo;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public void translateAsync(Long configId) {
        CompletableFuture.runAsync(() -> translateAndSave(configId));
    }

    private void translateAndSave(Long configId) {
        try {
            ConciergeConfig config = configRepo.findById(configId).orElse(null);
            if (config == null) return;

            Map<String, Object> translations = new LinkedHashMap<>();
            for (String lang : LANGS) {
                translations.put(lang, translateContent(config, lang));
            }
            config.setTranslationsJson(objectMapper.writeValueAsString(translations));
            configRepo.save(config);
            log.info("[concierge] Traductions régénérées configId={}", configId);
        } catch (Exception e) {
            log.warn("[concierge] Traduction échouée configId={} : {}", configId, e.getMessage());
        }
    }

    private Map<String, Object> translateContent(ConciergeConfig config, String lang) throws Exception {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("heroTitle", translate(config.getHeroTitle(), lang));
        m.put("heroSubtitle", translate(config.getHeroSubtitle(), lang));
        m.put("pitch", translate(config.getPitch(), lang));
        m.put("pricingText", translate(config.getPricingText(), lang));
        m.put("ctaButtonText", translate(config.getCtaButtonText(), lang));
        m.put("services", translateItems(config.getServicesJson(), lang, List.of("title", "description")));
        m.put("stats", translateItems(config.getStatsJson(), lang, List.of("label")));
        m.put("steps", translateItems(config.getStepsJson(), lang, List.of("title", "description")));
        m.put("testimonials", translateItems(config.getTestimonialsJson(), lang, List.of("text")));
        return m;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> translateItems(String json, String lang, List<String> fields) throws Exception {
        if (json == null || json.isBlank()) return List.of();
        List<Map<String, Object>> items = objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> item : items) {
            Map<String, Object> copy = new LinkedHashMap<>(item);
            for (String f : fields) {
                Object v = item.get(f);
                if (v != null && !v.toString().isBlank()) copy.put(f, translate(v.toString(), lang));
            }
            result.add(copy);
        }
        return result;
    }

    private String translate(String text, String lang) {
        if (text == null || text.isBlank()) return text;
        try {
            String url = "https://api.mymemory.translated.net/get?q={q}&langpair={pair}&de=contact@flowlyrent.com";
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(url, Map.class,
                    Map.of("q", text, "pair", "fr|" + lang));
            if (resp != null && resp.get("responseData") instanceof Map<?, ?> data) {
                Object translated = data.get("translatedText");
                if (translated != null && !translated.toString().isBlank()) {
                    return translated.toString();
                }
            }
        } catch (Exception e) {
            log.debug("[concierge] Échec appel traduction : {}", e.getMessage());
        }
        return text;
    }
}
