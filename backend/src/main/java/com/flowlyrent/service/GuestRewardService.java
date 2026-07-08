package com.flowlyrent.service;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.GuestBookingLog;
import com.flowlyrent.model.PromoCode;
import com.flowlyrent.repository.GuestBookingLogRepository;
import com.flowlyrent.repository.PromoCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Fidélité voyageurs (site de réservation public) — trace chaque réservation
 * directe dans GuestBookingLog (aucune donnée locale de réservation n'existe
 * autrement en mode Beds24) et génère un code promo à usage unique quand un
 * palier de séjours est franchi. Ne compte pas rétroactivement les
 * réservations antérieures à l'ajout de cette fonctionnalité.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GuestRewardService {

    private static final Map<Long, Integer> MILESTONE_DISCOUNTS = Map.of(
            3L, 5,
            5L, 10,
            10L, 15
    );

    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final GuestBookingLogRepository guestBookingLogRepo;
    private final PromoCodeRepository promoCodeRepo;

    public Map<String, Object> recordBookingAndMaybeIssueReward(
            AppUser user, String propertyId, String guestEmail, String bookingId) {
        if (guestEmail == null || guestEmail.isBlank()) return null;
        String normalizedEmail = guestEmail.trim().toLowerCase();

        GuestBookingLog logEntry = new GuestBookingLog();
        logEntry.setUser(user);
        logEntry.setBeds24PropertyId(propertyId);
        logEntry.setGuestEmail(normalizedEmail);
        logEntry.setBeds24BookingId(bookingId);
        guestBookingLogRepo.save(logEntry);

        long stayCount = guestBookingLogRepo.countByUserIdAndGuestEmailIgnoreCase(user.getId(), normalizedEmail);
        Integer discountPercent = MILESTONE_DISCOUNTS.get(stayCount);
        if (discountPercent == null) return null;

        PromoCode reward = new PromoCode();
        reward.setUser(user);
        reward.setBeds24PropertyId(propertyId);
        reward.setCode("MERCI" + stayCount + randomSuffix());
        reward.setDiscountPercent(discountPercent);
        reward.setActive(true);
        reward.setRestrictedGuestEmail(normalizedEmail);
        promoCodeRepo.save(reward);

        log.info("[GuestReward] userId={} guestEmail={} palier={} code={}",
                user.getId(), normalizedEmail, stayCount, reward.getCode());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("milestone", stayCount);
        result.put("discountPercent", discountPercent);
        result.put("code", reward.getCode());
        return result;
    }

    private String randomSuffix() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 5; i++) sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
        return sb.toString();
    }
}
