package com.flowlyrent.service;

import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.MinStayStrategy;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.MinStayStrategyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MinStayStrategyService {

    private final MinStayStrategyRepository repo;
    private final AppUserRepository userRepo;
    private final Beds24AccountRepository accountRepo;
    private final Beds24ApiClient beds24;

    // ─── Lecture / configuration ──────────────────────────────────────────────

    public MinStayStrategy getOrDefault(Long userId) {
        return repo.findByUserId(userId).orElseGet(() -> {
            MinStayStrategy s = new MinStayStrategy();
            s.setUser(userRepo.findById(userId).orElseThrow());
            return s;
        });
    }

    public MinStayStrategy save(Long userId, MinStayStrategy form) {
        MinStayStrategy strategy = repo.findByUserId(userId).orElseGet(() -> {
            MinStayStrategy s = new MinStayStrategy();
            s.setUser(userRepo.findById(userId).orElseThrow());
            return s;
        });
        strategy.setEnabled(form.isEnabled());
        strategy.setNearDays(form.getNearDays());
        strategy.setNearMinStay(form.getNearMinStay());
        strategy.setFarMinStay(form.getFarMinStay());
        strategy.setHorizonDays(form.getHorizonDays());
        return repo.save(strategy);
    }

    // ─── Exécution ─────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> runNow(Long userId) {
        MinStayStrategy strategy = getOrDefault(userId);
        Beds24Account account = accountRepo.findByAppUserId(userId)
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté."));

        try {
            String token = beds24.tokenFor(account);

            LocalDate today = LocalDate.now();
            LocalDate nearEnd = today.plusDays(strategy.getNearDays());
            LocalDate farEnd = today.plusDays(strategy.getHorizonDays());

            Map<String, String> calParams = new HashMap<>();
            calParams.put("startDate", today.toString());
            calParams.put("endDate", today.toString());
            List<Map<String, Object>> rooms = beds24.getCalendar(token, calParams);

            Set<Long> roomIds = new LinkedHashSet<>();
            for (Map<String, Object> room : rooms) {
                Object roomId = room.get("roomId");
                if (roomId == null) continue;
                roomIds.add(Long.parseLong(roomId.toString().split("\\.")[0]));
            }

            List<Map<String, Object>> payload = new ArrayList<>();
            for (Long roomId : roomIds) {
                Map<String, Object> farRange = new LinkedHashMap<>();
                farRange.put("from", today.toString());
                farRange.put("to", farEnd.toString());
                farRange.put("minStay", strategy.getFarMinStay());

                Map<String, Object> nearRange = new LinkedHashMap<>();
                nearRange.put("from", today.toString());
                nearRange.put("to", nearEnd.toString());
                nearRange.put("minStay", strategy.getNearMinStay());

                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("roomId", roomId);
                entry.put("calendar", List.of(farRange, nearRange));
                payload.add(entry);
            }

            if (!payload.isEmpty()) {
                beds24.updateCalendar(token, payload);
            }

            strategy.setLastRunAt(LocalDateTime.now());
            strategy.setLastRunStatus("OK (" + payload.size() + " logement" + (payload.size() > 1 ? "s" : "") + ")");
            repo.save(strategy);

            return Map.of("success", true, "propertiesUpdated", payload.size());
        } catch (Exception e) {
            log.error("[MinStay] Erreur exécution stratégie userId={}: {}", userId, e.getMessage());
            strategy.setLastRunAt(LocalDateTime.now());
            strategy.setLastRunStatus("Erreur : " + e.getMessage());
            repo.save(strategy);
            return Map.of("success", false, "error", e.getMessage());
        }
    }

    // ─── Exécution automatique quotidienne (3h) ────────────────────────────────

    @Scheduled(cron = "0 0 3 * * *")
    public void runDaily() {
        List<MinStayStrategy> strategies = repo.findByEnabledTrue();
        log.info("[MinStay] Exécution quotidienne pour {} stratégie(s) active(s)", strategies.size());
        for (MinStayStrategy strategy : strategies) {
            try {
                runNow(strategy.getUser().getId());
            } catch (Exception e) {
                log.error("[MinStay] Échec exécution quotidienne userId={}: {}", strategy.getUser().getId(), e.getMessage());
            }
        }
    }
}
