package com.flowlyrent.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.KeyBox;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.model.PropertyPhoto;
import com.flowlyrent.model.enums.ChannelType;
import com.flowlyrent.repository.KeyBoxRepository;
import com.flowlyrent.repository.PropertyConfigRepository;
import com.flowlyrent.repository.PropertyPhotoRepository;
import com.flowlyrent.service.Beds24ScraperService;
import com.flowlyrent.service.CloudinaryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/property-configs")
@RequiredArgsConstructor
@Tag(name = "Configuration des propriétés")
@Slf4j
public class AdminPropertyConfigController {

    private final PropertyConfigRepository repo;
    private final KeyBoxRepository keyBoxRepo;
    private final SecurityUtils securityUtils;
    private final Beds24ScraperService scraperService;
    private final PropertyPhotoRepository photoRepo;
    private final CloudinaryService cloudinaryService;
    private final ObjectMapper objectMapper;
    private final Random random = new Random();

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        AppUser user = securityUtils.getCurrentUser();
        List<PropertyConfig> configs = user.getChannelType() == ChannelType.ICAL
                ? repo.findByUserIdAndLocalPropertyIdIsNotNull(user.getId())
                : repo.findByUserIdAndLocalPropertyIdIsNull(user.getId());
        List<Map<String, Object>> result = configs.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{beds24PropertyId}")
    public ResponseEntity<Map<String, Object>> upsert(
            @PathVariable String beds24PropertyId,
            @RequestBody Map<String, String> body) {
        AppUser user = securityUtils.getCurrentUser();
        PropertyConfig cfg = repo.findByUserIdAndBeds24PropertyId(user.getId(), beds24PropertyId)
                .orElseGet(() -> { PropertyConfig c = new PropertyConfig(); c.setUser(user); c.setBeds24PropertyId(beds24PropertyId); return c; });

        if (body.containsKey("shortName")) {
            String sn = body.get("shortName");
            cfg.setShortName(sn != null && !sn.isBlank() ? sn.trim() : null);
        }
        if (body.containsKey("keyBoxId")) {
            String kbIdStr = body.get("keyBoxId");
            if (kbIdStr == null || kbIdStr.isBlank()) {
                KeyBox previous = cfg.getKeyBox();
                cfg.setKeyBox(null);
                repo.save(cfg);
                if (previous != null && repo.findByKeyBoxId(previous.getId()).isEmpty()) {
                    keyBoxRepo.delete(previous);
                }
            } else {
                Long kbId = Long.parseLong(kbIdStr);
                KeyBox kb = keyBoxRepo.findByIdAndUserId(kbId, user.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
                cfg.setKeyBox(kb);
            }
        }
        if (body.containsKey("accessCode")) {
            String newCode = body.get("accessCode");
            KeyBox kb = cfg.getKeyBox();
            if (kb != null) {
                // Mise à jour du code de la boîte partagée
                if (kb.getAccessCode() != null && !kb.getAccessCode().equals(newCode))
                    kb.setPreviousAccessCode(kb.getAccessCode());
                kb.setAccessCode(newCode);
                keyBoxRepo.save(kb);
            } else {
                if (cfg.getAccessCode() != null && !cfg.getAccessCode().equals(newCode))
                    cfg.setPreviousAccessCode(cfg.getAccessCode());
                cfg.setAccessCode(newCode);
            }
        }
        if (body.containsKey("cleaningHours")) {
            String v = body.get("cleaningHours");
            cfg.setCleaningHours(v != null && !v.isBlank() ? Float.parseFloat(v) : null);
        }
        if (body.containsKey("cleaningFee")) {
            String v = body.get("cleaningFee");
            cfg.setCleaningFee(v != null && !v.isBlank() ? Float.parseFloat(v) : null);
        }
        if (body.containsKey("extraPersonThreshold")) {
            String v = body.get("extraPersonThreshold");
            cfg.setExtraPersonThreshold(v != null && !v.isBlank() ? Integer.parseInt(v) : null);
        }
        if (body.containsKey("extraPersonFee")) {
            String v = body.get("extraPersonFee");
            cfg.setExtraPersonFee(v != null && !v.isBlank() ? Float.parseFloat(v) : null);
        }
        if (body.containsKey("discount7Nights")) {
            String v = body.get("discount7Nights");
            cfg.setDiscount7Nights(v != null && !v.isBlank() ? Float.parseFloat(v) : null);
        }
        if (body.containsKey("discount28Nights")) {
            String v = body.get("discount28Nights");
            cfg.setDiscount28Nights(v != null && !v.isBlank() ? Float.parseFloat(v) : null);
        }
        if (body.containsKey("coverPhotoUrl")) {
            String v = body.get("coverPhotoUrl");
            cfg.setCoverPhotoUrl(v != null && !v.isBlank() ? v.trim() : null);
        }
        return ResponseEntity.ok(toDto(repo.save(cfg)));
    }

    @PostMapping("/{beds24PropertyId}/scrape-photos")
    public ResponseEntity<?> scrapePhotos(@PathVariable String beds24PropertyId) {
        AppUser user = securityUtils.getCurrentUser();
        List<String> photos = scraperService.scrapePropertyPhotos(beds24PropertyId);
        if (!photos.isEmpty()) {
            PropertyConfig cfg = repo.findByUserIdAndBeds24PropertyId(user.getId(), beds24PropertyId)
                    .orElseGet(() -> { PropertyConfig c = new PropertyConfig(); c.setUser(user); c.setBeds24PropertyId(beds24PropertyId); return c; });
            cfg.setCoverPhotoUrl(photos.get(0));
            try { cfg.setPhotoUrlsJson(objectMapper.writeValueAsString(photos)); } catch (Exception ignored) {}
            repo.save(cfg);
        }
        return ResponseEntity.ok(Map.of("photos", photos));
    }

    @PostMapping("/{beds24PropertyId}/regenerate")
    public ResponseEntity<Map<String, Object>> regenerate(@PathVariable String beds24PropertyId) {
        AppUser user = securityUtils.getCurrentUser();
        PropertyConfig cfg = repo.findByUserIdAndBeds24PropertyId(user.getId(), beds24PropertyId)
                .orElseGet(() -> { PropertyConfig c = new PropertyConfig(); c.setUser(user); c.setBeds24PropertyId(beds24PropertyId); return c; });
        String code = String.format("%04d", random.nextInt(10000));
        KeyBox kb = cfg.getKeyBox();
        if (kb != null) {
            if (kb.getAccessCode() != null) kb.setPreviousAccessCode(kb.getAccessCode());
            kb.setAccessCode(code);
            keyBoxRepo.save(kb);
        } else {
            if (cfg.getAccessCode() != null) cfg.setPreviousAccessCode(cfg.getAccessCode());
            cfg.setAccessCode(code);
            repo.save(cfg);
        }
        return ResponseEntity.ok(toDto(cfg));
    }

    // ─────────────────────────────────────────────────────────────────────
    // Photos manuelles du logement
    // ─────────────────────────────────────────────────────────────────────

    @GetMapping("/{beds24PropertyId}/photos")
    public ResponseEntity<List<PropertyPhoto>> getPhotos(@PathVariable String beds24PropertyId) {
        PropertyConfig cfg = findCfgForCurrentUser(beds24PropertyId);
        return ResponseEntity.ok(photoRepo.findByPropertyConfigIdOrderByUploadedAtAsc(cfg.getId()));
    }

    @PostMapping("/{beds24PropertyId}/photos")
    public ResponseEntity<PropertyPhoto> addPhoto(
            @PathVariable String beds24PropertyId,
            @RequestBody Map<String, String> body) {
        PropertyConfig cfg = findCfgForCurrentUser(beds24PropertyId);
        String base64Data = body.getOrDefault("data", "");
        String caption    = body.getOrDefault("caption", "");

        PropertyPhoto photo = new PropertyPhoto();
        photo.setPropertyConfig(cfg);
        photo.setCaption(caption.isBlank() ? null : caption);

        try {
            Map<?, ?> result = cloudinaryService.uploadBase64(base64Data, "flowlyrent/properties/" + beds24PropertyId);
            photo.setUrl(result.get("secure_url").toString());
            photo.setPublicId(result.get("public_id").toString());
        } catch (Exception e) {
            log.warn("[property-photo] Cloudinary indisponible, stockage base64 — propId={}", beds24PropertyId);
            photo.setData(base64Data);
        }

        return ResponseEntity.ok(photoRepo.save(photo));
    }

    @DeleteMapping("/{beds24PropertyId}/photos/{photoId}")
    public ResponseEntity<Void> deletePhoto(
            @PathVariable String beds24PropertyId,
            @PathVariable Long photoId) {
        PropertyConfig cfg = findCfgForCurrentUser(beds24PropertyId);
        PropertyPhoto photo = photoRepo.findById(photoId)
                .filter(p -> p.getPropertyConfig().getId().equals(cfg.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (photo.getPublicId() != null) {
            try { cloudinaryService.delete(photo.getPublicId()); } catch (Exception ignored) {}
        }
        photoRepo.delete(photo);
        return ResponseEntity.noContent().build();
    }

    private PropertyConfig findCfgForCurrentUser(String beds24PropertyId) {
        AppUser user = securityUtils.getCurrentUser();
        return repo.findByUserIdAndBeds24PropertyId(user.getId(), beds24PropertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private Map<String, Object> toDto(PropertyConfig cfg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("beds24PropertyId", cfg.getBeds24PropertyId());
        m.put("shortName", cfg.getShortName());
        KeyBox kb = cfg.getKeyBox();
        if (kb != null) {
            m.put("accessCode", kb.getAccessCode());
            m.put("previousAccessCode", kb.getPreviousAccessCode());
            m.put("keyBoxId", kb.getId());
            m.put("keyBoxName", kb.getName());
        } else {
            m.put("accessCode", cfg.getAccessCode());
            m.put("previousAccessCode", cfg.getPreviousAccessCode());
            m.put("keyBoxId", null);
            m.put("keyBoxName", null);
        }
        m.put("cleaningHours", cfg.getCleaningHours());
        m.put("cleaningFee", cfg.getCleaningFee());
        m.put("extraPersonThreshold", cfg.getExtraPersonThreshold());
        m.put("extraPersonFee", cfg.getExtraPersonFee());
        m.put("discount7Nights", cfg.getDiscount7Nights());
        m.put("discount28Nights", cfg.getDiscount28Nights());
        m.put("coverPhotoUrl", cfg.getCoverPhotoUrl());
        List<String> photoUrls = List.of();
        if (cfg.getPhotoUrlsJson() != null && !cfg.getPhotoUrlsJson().isBlank()) {
            try { photoUrls = objectMapper.readValue(cfg.getPhotoUrlsJson(), new TypeReference<>() {}); } catch (Exception ignored) {}
        }
        m.put("photoUrls", photoUrls);
        return m;
    }
}
