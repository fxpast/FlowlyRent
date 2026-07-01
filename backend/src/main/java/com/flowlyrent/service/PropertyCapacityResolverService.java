package com.flowlyrent.service;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.repository.PropertyConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Résout maxPeople (capacité voyageurs) par logement en le persistant dans PropertyConfig —
 * la capacité ne change quasiment jamais, inutile de la redemander à Beds24 (donc de
 * consommer des crédits d'API) à chaque recherche sur le site public.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyCapacityResolverService {

    private final PropertyConfigRepository propertyConfigRepo;
    private final Beds24ApiClient beds24;

    public Map<String, Integer> resolveMaxPeople(AppUser user, String token, Set<String> propertyIds) throws Exception {
        Map<String, Integer> result = new HashMap<>();
        Set<String> missing = new HashSet<>();

        for (String pid : propertyIds) {
            PropertyConfig cfg = propertyConfigRepo.findByUserIdAndBeds24PropertyId(user.getId(), pid).orElse(null);
            if (cfg != null && cfg.getMaxPeople() != null) {
                result.put(pid, cfg.getMaxPeople());
            } else {
                missing.add(pid);
            }
        }
        if (missing.isEmpty()) return result;

        // /inventory/rooms exige un propertyId (HTTP 500 "Could not process request" sans filtre) —
        // contrairement à /properties ou /bookings. Un appel par logement manquant est nécessaire,
        // mais n'a lieu qu'une seule fois par logement grâce au cache PropertyConfig ci-dessous.
        Map<String, Integer> fetched = new HashMap<>();
        for (String pid : missing) {
            try {
                List<Map<String, Object>> rooms = beds24.getRooms(token, Map.of("propertyId", pid));
                if (rooms == null || rooms.isEmpty()) continue;
                if (fetched.isEmpty() && result.isEmpty()) {
                    log.info("[capacity] clés du 1er objet room (propId={}) : {}", pid, rooms.get(0).keySet());
                }
                Object mp = rooms.get(0).get("maxPeople");
                if (mp instanceof Number n) {
                    int v = n.intValue();
                    if (v > 0) fetched.put(pid, v);
                }
            } catch (Exception e) {
                log.warn("[capacity] Échec résolution maxPeople propId={} : {}", pid, e.getMessage());
            }
        }
        log.info("[capacity] maxPeople résolu pour {}/{} propertyId manquants : {}", fetched.size(), missing.size(), fetched);

        for (Map.Entry<String, Integer> e : fetched.entrySet()) {
            result.put(e.getKey(), e.getValue());
            PropertyConfig cfg = propertyConfigRepo.findByUserIdAndBeds24PropertyId(user.getId(), e.getKey())
                    .orElseGet(() -> {
                        PropertyConfig c = new PropertyConfig();
                        c.setUser(user);
                        c.setBeds24PropertyId(e.getKey());
                        return c;
                    });
            cfg.setMaxPeople(e.getValue());
            propertyConfigRepo.save(cfg);
        }
        return result;
    }
}
