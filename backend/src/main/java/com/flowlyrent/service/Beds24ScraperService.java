package com.flowlyrent.service;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class Beds24ScraperService {

    private static final String BOOKING_URL = "https://beds24.com/booking.php?propid=";
    private static final List<String> LAZY_ATTRS = List.of("src", "data-src", "data-lazy", "data-original", "data-image");

    public List<String> scrapePropertyPhotos(String propId) {
        String url = BOOKING_URL + propId;
        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .header("Accept-Language", "fr-FR,fr;q=0.9,en;q=0.8")
                    .timeout(15_000)
                    .get();

            List<String> photos = new ArrayList<>();

            // og:image — fiable, souvent la photo principale
            String ogImage = doc.select("meta[property=og:image]").attr("content");
            if (!ogImage.isBlank()) photos.add(ogImage);

            // Tous les <img> — vérifier src + attributs lazy-load
            for (Element img : doc.select("img")) {
                for (String attr : LAZY_ATTRS) {
                    String val = img.attr(attr);
                    if (!val.isBlank() && isLikelyPropertyPhoto(val)) {
                        String abs = toAbsolute(val);
                        if (!abs.isBlank()) photos.add(abs);
                        break;
                    }
                }
            }

            List<String> result = photos.stream().distinct().limit(20).collect(Collectors.toList());
            log.info("[scraper] propId={} — {} photo(s) trouvée(s)", propId, result.size());
            return result;

        } catch (Exception e) {
            log.warn("[scraper] Erreur propId={} : {}", propId, e.getMessage());
            return List.of();
        }
    }

    private boolean isLikelyPropertyPhoto(String src) {
        if (src == null || src.isBlank() || src.startsWith("data:")) return false;
        String lower = src.toLowerCase();
        if (lower.contains("logo") || lower.contains("icon") || lower.contains("favicon")
                || lower.contains("button") || lower.contains("star") || lower.contains("pixel")
                || lower.contains("flag") || lower.contains("loading") || lower.contains("arrow")
                || lower.contains("sprite") || lower.contains("badge")) return false;
        return lower.contains("pictur") || lower.contains("photo") || lower.contains("upload")
                || lower.contains("image") || lower.contains("gallery") || lower.contains("slide")
                || lower.matches(".*\\.(jpg|jpeg|png|webp)(\\?.*)?$");
    }

    private String toAbsolute(String src) {
        if (src.startsWith("http")) return src;
        if (src.startsWith("//")) return "https:" + src;
        if (src.startsWith("/")) return "https://beds24.com" + src;
        return "";
    }
}
