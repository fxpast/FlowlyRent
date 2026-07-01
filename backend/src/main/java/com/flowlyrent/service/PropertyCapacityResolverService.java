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

        List<Map<String, Object>> rooms = beds24.getRooms(token, Map.of());
        log.info("[capacity] /inventory/rooms → {} chambre(s) reçue(s), {} propertyId manquant(s) : {}",
                rooms == null ? 0 : rooms.size(), missing.size(), missing);
        if (rooms != null && !rooms.isEmpty()) {
            log.info("[capacity] clés du 1er objet room : {}", rooms.get(0).keySet());
            log.info("[capacity] contenu du 1er objet room : {}", rooms.get(0));
        }

        Map<String, Integer> fetched = new HashMap<>();
        for (Map<String, Object> room : rooms) {
            Object rawPropId = room.get("propertyId");
            String roomPropId = rawPropId instanceof Number n ? String.valueOf(n.longValue())
                    : rawPropId == null ? null : rawPropId.toString().trim();
            Object mp = room.get("maxPeople");
            if (roomPropId != null && missing.contains(roomPropId) && mp instanceof Number n) {
                int v = n.intValue();
                if (v > 0) fetched.merge(roomPropId, v, Math::max);
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
