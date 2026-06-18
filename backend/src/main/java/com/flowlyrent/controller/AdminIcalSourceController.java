package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.LocalProperty;
import com.flowlyrent.model.PropertyIcalSource;
import com.flowlyrent.repository.IcalBookingRepository;
import com.flowlyrent.repository.LocalPropertyRepository;
import com.flowlyrent.repository.PropertyIcalSourceRepository;
import com.flowlyrent.service.IcalSyncService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/local-properties/{propId}/ical-sources")
@RequiredArgsConstructor
@Tag(name = "Sources iCal")
public class AdminIcalSourceController {

    private final LocalPropertyRepository localPropertyRepo;
    private final PropertyIcalSourceRepository icalSourceRepo;
    private final IcalBookingRepository icalBookingRepo;
    private final IcalSyncService icalSyncService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@PathVariable Long propId) {
        if (!ownsProperty(propId)) return ResponseEntity.notFound().build();
        List<Map<String, Object>> result = icalSourceRepo.findByLocalPropertyIdOrderByIdAsc(propId)
                .stream().map(this::toMap).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> create(@PathVariable Long propId, @RequestBody Map<String, String> body) {
        LocalProperty prop = getOwnedProperty(propId);
        if (prop == null) return ResponseEntity.notFound().build();

        String name = body.get("name");
        String url = body.get("url");
        if (name == null || name.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Nom requis"));
        if (url == null || url.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "URL requise"));

        PropertyIcalSource source = new PropertyIcalSource();
        source.setLocalProperty(prop);
        source.setName(name.trim());
        source.setUrl(url.trim());
        return ResponseEntity.ok(toMap(icalSourceRepo.save(source)));
    }

    @PutMapping("/{sourceId}")
    public ResponseEntity<?> update(@PathVariable Long propId, @PathVariable Long sourceId,
                                    @RequestBody Map<String, String> body) {
        if (!ownsProperty(propId)) return ResponseEntity.notFound().build();
        PropertyIcalSource source = icalSourceRepo.findByIdAndLocalPropertyId(sourceId, propId).orElse(null);
        if (source == null) return ResponseEntity.notFound().build();

        if (body.containsKey("name") && !body.get("name").isBlank()) source.setName(body.get("name").trim());
        if (body.containsKey("url") && !body.get("url").isBlank()) source.setUrl(body.get("url").trim());
        return ResponseEntity.ok(toMap(icalSourceRepo.save(source)));
    }

    @DeleteMapping("/{sourceId}")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long propId, @PathVariable Long sourceId) {
        if (!ownsProperty(propId)) return ResponseEntity.notFound().build();
        PropertyIcalSource source = icalSourceRepo.findByIdAndLocalPropertyId(sourceId, propId).orElse(null);
        if (source == null) return ResponseEntity.notFound().build();

        icalBookingRepo.deleteBySourceId(sourceId);
        icalSourceRepo.delete(source);
        return ResponseEntity.ok(Map.of("status", "supprimé"));
    }

    @PostMapping("/{sourceId}/sync")
    public ResponseEntity<?> sync(@PathVariable Long propId, @PathVariable Long sourceId) {
        if (!ownsProperty(propId)) return ResponseEntity.notFound().build();
        PropertyIcalSource source = icalSourceRepo.findByIdAndLocalPropertyId(sourceId, propId).orElse(null);
        if (source == null) return ResponseEntity.notFound().build();

        try {
            int count = icalSyncService.syncSource(source);
            source.setLastSync(LocalDateTime.now());
            source.setLastSyncCount(count);
            icalSourceRepo.save(source);
            return ResponseEntity.ok(Map.of("status", "sync terminée", "count", count));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private boolean ownsProperty(Long propId) {
        Long userId = securityUtils.getCurrentUserId();
        return localPropertyRepo.findByIdAndUserId(propId, userId).isPresent();
    }

    private LocalProperty getOwnedProperty(Long propId) {
        Long userId = securityUtils.getCurrentUserId();
        return localPropertyRepo.findByIdAndUserId(propId, userId).orElse(null);
    }

    private Map<String, Object> toMap(PropertyIcalSource s) {
        java.util.Map<String, Object> m = new java.util.HashMap<>();
        m.put("id", s.getId());
        m.put("name", s.getName());
        m.put("url", s.getUrl());
        m.put("lastSync", s.getLastSync() != null ? s.getLastSync().toString() : null);
        m.put("lastSyncCount", s.getLastSyncCount());
        return m;
    }
}
