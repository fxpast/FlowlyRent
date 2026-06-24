package com.flowlyrent.service;

import com.flowlyrent.model.PropertyConfig;
import com.flowlyrent.repository.PropertyConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Résout le roomId Beds24 d'un logement en le persistant dans PropertyConfig — la
 * correspondance propertyId → roomId ne change quasiment jamais, inutile de la
 * redemander à Beds24 (donc de consommer des crédits d'API) à chaque mise à jour
 * de prix, blocage de dates ou création de réservation.
 */
@Service
@RequiredArgsConstructor
public class RoomIdResolverService {

    private final PropertyConfigRepository propertyConfigRepo;
    private final Beds24ApiClient beds24;

    public Long resolveRoomId(Long userId, String token, String propertyId, String from, String to) throws Exception {
        PropertyConfig config = propertyConfigRepo.findByUserIdAndBeds24PropertyId(userId, propertyId).orElse(null);
        if (config != null && config.getRoomId() != null) {
            return config.getRoomId();
        }

        Long roomId = beds24.resolveRoomId(token, propertyId, from, to);

        if (config == null) return roomId;
        config.setRoomId(roomId);
        propertyConfigRepo.save(config);
        return roomId;
    }
}
