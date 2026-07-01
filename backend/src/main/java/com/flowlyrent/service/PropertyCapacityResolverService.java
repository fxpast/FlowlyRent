package com.flowlyrent.service;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.repository.PropertyConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Résout maxPeople (capacité voyageurs) par logement à partir du champ "roomTypes" présent
 * dans la réponse Beds24 GET /properties?includeAllRooms=true (pas de "maxPeople" au niveau
 * racine de la propriété, et /inventory/rooms n'est pas utilisable en filtrage libre — il
 * répond HTTP 500 "Could not process request" hors contexte calendrier). Le résultat est mis
 * en cache dans PropertyConfig.maxPeople pour éviter de reparser à chaque appel.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyCapacityResolverService {

    private final PropertyConfigRepository propertyConfigRepo;

    /**
     * @param propsWithRoomTypes réponse de beds24.getProperties(token, Map.of("includeAllRooms", "true"))
     */
    @SuppressWarnings("unchecked")
    public Map<String, Integer> resolveMaxPeople(AppUser user, List<Map<String, Object>> propsWithRoomTypes, java.util.function.Function<Map<String, Object>, String> extractPropertyId) {
        Map<String, Integer> result = new HashMap<>();
        boolean logged = false;

        for (Map<String, Object> prop : propsWithRoomTypes) {
            String pid = extractPropertyId.apply(prop);
            if (pid == null) continue;

            PropertyConfig cfg = propertyConfigRepo.findByUserIdAndBeds24PropertyId(user.getId(), pid).orElse(null);
            if (cfg != null && cfg.getMaxPeople() != null) {
                result.put(pid, cfg.getMaxPeople());
                continue;
            }

            int max = 0;
            Object roomTypesObj = prop.get("roomTypes");
            if (!logged) {
                log.info("[capacity] propId={} roomTypes présent={} contenu={}", pid, roomTypesObj != null, roomTypesObj);
                logged = true;
            }
            if (roomTypesObj instanceof List<?> roomTypes) {
                for (Object rt : roomTypes) {
                    if (!(rt instanceof Map)) continue;
                    Object mp = ((Map<String, Object>) rt).get("maxPeople");
                    int v = parseInt(mp);
                    if (v > max) max = v;
                }
            }
            if (max <= 0) continue;

            result.put(pid, max);
            PropertyConfig toSave = cfg != null ? cfg : new PropertyConfig();
            if (cfg == null) {
                toSave.setUser(user);
                toSave.setBeds24PropertyId(pid);
            }
            toSave.setMaxPeople(max);
            propertyConfigRepo.save(toSave);
        }
        return result;
    }

    private static int parseInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number n) return n.intValue();
        try { return Integer.parseInt(val.toString().trim()); } catch (Exception e) { return 0; }
    }
}
