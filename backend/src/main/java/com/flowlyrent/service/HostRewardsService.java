package com.flowlyrent.service;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.repository.AutoResponderConfigRepository;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.HousekeeperProfileRepository;
import com.flowlyrent.repository.PromoCodeRepository;
import com.flowlyrent.repository.PropertyConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Badges d'adoption des fonctionnalités pour l'hôte — calculés à la volée en
 * vérifiant l'existence de données déjà en base (pas d'event-log dédié :
 * AnalyticsEvent ne trace que LOGIN/PAGE_VIEW/CLICK, inutilisable ici).
 * Pas de classement entre hôtes (décision produit : positionnement B2B).
 */
@Service
@RequiredArgsConstructor
public class HostRewardsService {

    private static final int POINTS_PER_BADGE = 50;

    private final Beds24AccountRepository beds24AccountRepo;
    private final PropertyConfigRepository propertyConfigRepo;
    private final PromoCodeRepository promoCodeRepo;
    private final AutoResponderConfigRepository autoResponderConfigRepo;
    private final HousekeeperProfileRepository housekeeperProfileRepo;

    public Map<String, Object> computeRewards(AppUser user) {
        boolean beds24Connected = beds24AccountRepo.findByAppUserId(user.getId())
                .map(a -> a.isConnected()).orElse(false);
        boolean firstProperty = !propertyConfigRepo.findByUserId(user.getId()).isEmpty();
        boolean stripeConnected = user.getStripeAccountId() != null && !user.getStripeAccountId().isBlank();
        boolean firstPromoCode = !promoCodeRepo.findByUserId(user.getId()).isEmpty();
        boolean autoResponderEnabled = autoResponderConfigRepo.findByUserId(user.getId())
                .map(c -> c.isEnabled()).orElse(false);
        boolean teamBuilt = !housekeeperProfileRepo.findByUserIdAndActiveTrueOrderByNameAsc(user.getId()).isEmpty();
        boolean siteOnline = user.getPublicSiteSlug() != null && !user.getPublicSiteSlug().isBlank();

        long accountAgeDays = user.getCreatedAt() != null
                ? ChronoUnit.DAYS.between(user.getCreatedAt(), LocalDateTime.now())
                : 0;

        List<Map<String, Object>> badges = new ArrayList<>();
        badges.add(badge("beds24_connected", beds24Connected));
        badges.add(badge("first_property", firstProperty));
        badges.add(badge("stripe_connected", stripeConnected));
        badges.add(badge("first_promo_code", firstPromoCode));
        badges.add(badge("auto_responder_enabled", autoResponderEnabled));
        badges.add(badge("team_built", teamBuilt));
        badges.add(badge("site_online", siteOnline));
        badges.add(badge("tenure_1m", accountAgeDays >= 30));
        badges.add(badge("tenure_3m", accountAgeDays >= 90));
        badges.add(badge("tenure_1y", accountAgeDays >= 365));

        long unlockedCount = badges.stream().filter(b -> (boolean) b.get("unlocked")).count();
        int points = (int) (unlockedCount * POINTS_PER_BADGE);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("points", points);
        result.putAll(computeLevel(points));
        result.put("badges", badges);
        return result;
    }

    private Map<String, Object> badge(String key, boolean unlocked) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key);
        m.put("unlocked", unlocked);
        return m;
    }

    private Map<String, Object> computeLevel(int points) {
        String key;
        int nextThreshold;
        if (points >= 400)      { key = "AMBASSADOR"; nextThreshold = -1; }
        else if (points >= 250) { key = "EXPERT";      nextThreshold = 400; }
        else if (points >= 100) { key = "CONFIRMED";   nextThreshold = 250; }
        else                    { key = "BEGINNER";    nextThreshold = 100; }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("levelKey", key);
        m.put("nextLevelThreshold", nextThreshold);
        return m;
    }
}
