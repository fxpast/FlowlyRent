package com.flowlyrent.service;

import com.flowlyrent.model.FaqItem;
import com.flowlyrent.repository.FaqRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
public class FaqTranslationService {

    private static final Logger log = LoggerFactory.getLogger(FaqTranslationService.class);
    private static final List<String> LANGS = List.of("en", "es", "de", "it");

    private final FaqRepository faqRepository;
    private final RestTemplate restTemplate;

    public void translateAsync(FaqItem item) {
        CompletableFuture.runAsync(() -> translateAndSave(item));
    }

    public void translateAllAsync() {
        CompletableFuture.runAsync(() ->
            faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc()
                         .forEach(this::translateAndSave)
        );
    }

    private void translateAndSave(FaqItem item) {
        try {
            for (String lang : LANGS) {
                String q = translate(item.getQuestion(), "fr", lang);
                String a = translate(item.getAnswer(),   "fr", lang);
                switch (lang) {
                    case "en" -> { item.setQuestionEn(q); item.setAnswerEn(a); }
                    case "es" -> { item.setQuestionEs(q); item.setAnswerEs(a); }
                    case "de" -> { item.setQuestionDe(q); item.setAnswerDe(a); }
                    case "it" -> { item.setQuestionIt(q); item.setAnswerIt(a); }
                }
            }
            faqRepository.save(item);
        } catch (Exception e) {
            log.warn("FAQ translation failed for id={}: {}", item.getId(), e.getMessage());
        }
    }

    private String translate(String text, String from, String to) {
        try {
            String url = "https://api.mymemory.translated.net/get?q={q}&langpair={pair}&de=contact@flowlyrent.com";
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(url, Map.class,
                    Map.of("q", text, "pair", from + "|" + to));
            if (resp != null && resp.get("responseData") instanceof Map<?, ?> data) {
                Object translated = data.get("translatedText");
                if (translated != null && !translated.toString().isBlank()) {
                    return translated.toString();
                }
            }
        } catch (Exception e) {
            log.debug("Translation call failed: {}", e.getMessage());
        }
        return text;
    }
}
