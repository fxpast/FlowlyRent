package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.LocalEvent;
import com.flowlyrent.model.enums.ImpactLevel;
import com.flowlyrent.repository.LocalEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/local-events")
@RequiredArgsConstructor
public class AdminLocalEventController {

    private final LocalEventRepository eventRepo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public List<Map<String, Object>> list() {
        Long userId = securityUtils.getCurrentUserId();
        return eventRepo.findByUserIdOrderByStartDateAsc(userId).stream()
                .map(this::toMap).collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        LocalEvent event = fromBody(new LocalEvent(), body);
        event.setUserId(userId);
        return ResponseEntity.ok(toMap(eventRepo.save(event)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        return eventRepo.findById(id)
                .filter(e -> e.getUserId().equals(userId))
                .map(event -> ResponseEntity.ok(toMap(eventRepo.save(fromBody(event, body)))))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        return eventRepo.findById(id)
                .filter(e -> e.getUserId().equals(userId))
                .map(event -> { eventRepo.delete(event); return ResponseEntity.ok().build(); })
                .orElse(ResponseEntity.notFound().build());
    }

    private LocalEvent fromBody(LocalEvent event, Map<String, Object> body) {
        if (body.containsKey("name"))        event.setName(body.get("name").toString());
        if (body.containsKey("startDate"))   event.setStartDate(LocalDate.parse(body.get("startDate").toString()));
        if (body.containsKey("endDate"))     event.setEndDate(LocalDate.parse(body.get("endDate").toString()));
        if (body.containsKey("impactLevel")) event.setImpactLevel(ImpactLevel.valueOf(body.get("impactLevel").toString()));
        if (body.containsKey("recurring"))   event.setRecurring(Boolean.parseBoolean(body.get("recurring").toString()));
        event.setZoneId(body.get("zoneId") != null ? Long.parseLong(body.get("zoneId").toString()) : null);
        return event;
    }

    private Map<String, Object> toMap(LocalEvent e) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",          e.getId());
        m.put("zoneId",      e.getZoneId());
        m.put("name",        e.getName());
        m.put("startDate",   e.getStartDate());
        m.put("endDate",     e.getEndDate());
        m.put("impactLevel", e.getImpactLevel());
        m.put("recurring",   e.isRecurring());
        return m;
    }
}
