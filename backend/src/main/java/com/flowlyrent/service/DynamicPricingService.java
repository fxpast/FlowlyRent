package com.flowlyrent.service;

import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.LocalEvent;
import com.flowlyrent.model.PricingEventImpactConfig;
import com.flowlyrent.model.PricingZonePeriod;
import com.flowlyrent.model.PropertyPricingConfig;
import com.flowlyrent.model.enums.ImpactLevel;
import com.flowlyrent.repository.LocalEventRepository;
import com.flowlyrent.repository.PricingEventImpactConfigRepository;
import com.flowlyrent.repository.PricingZonePeriodRepository;
import com.flowlyrent.repository.PropertyPricingConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DynamicPricingService {

    private final Beds24ApiClient beds24;
    private final PricingZonePeriodRepository periodRepo;
    private final PropertyPricingConfigRepository propPricingRepo;
    private final LocalEventRepository eventRepo;
    private final PricingEventImpactConfigRepository eventImpactConfigRepo;

    @SuppressWarnings("unchecked")
    public Map<String, Object> calculateSuggestion(
            Long userId, Beds24Account account,
            String propId, String startDate, String endDate) throws Exception {

        LocalDate start = LocalDate.parse(startDate);
        String token = beds24.tokenFor(account);

        // 1. Historique 24 mois pour ce logement
        // Pas de filtre status côté API — sensible à la casse et peu fiable en v2, on filtre en Java
        Map<String, String> histParams = new HashMap<>();
        histParams.put("arrivalFrom", start.minusYears(2).toString());
        histParams.put("arrivalTo", start.minusDays(1).toString());
        List<Map<String, Object>> allHistBookings = beds24.getBookings(token, histParams);
        log.debug("[pricing] propId={} — {} réservations brutes Beds24 ({} → {})", propId, allHistBookings.size(), histParams.get("arrivalFrom"), histParams.get("arrivalTo"));
        if (!allHistBookings.isEmpty()) {
            Map<String, Object> sample = allHistBookings.get(0);
            log.debug("[pricing] Champs dispo : keys={} propId={} propertyId={} status={} totalPrice={} price={}",
                    sample.keySet(), sample.get("propId"), sample.get("propertyId"), sample.get("status"), sample.get("totalPrice"), sample.get("price"));
        }
        List<Map<String, Object>> propBookings = allHistBookings.stream()
                .filter(b -> {
                    String bPropId = str(b, "propId") != null ? str(b, "propId") : str(b, "propertyId");
                    return propId.equals(bPropId);
                })
                .filter(b -> { String s = str(b, "status"); return s != null && (s.equalsIgnoreCase("confirmed") || s.equalsIgnoreCase("new")); })
                .collect(Collectors.toList());
        log.debug("[pricing] propId={} — {} réservations après filtres propId+status", propId, propBookings.size());

        // 2. Prix de base = moyenne prix/nuit sur le même mois ±1
        int targetMonth = start.getMonthValue();
        List<Double> pricesPerNight = new ArrayList<>();
        for (Map<String, Object> b : propBookings) {
            String arr = str(b, "arrival");
            String dep = str(b, "departure");
            if (arr == null || dep == null || arr.length() < 7) continue;
            int bMonth = Integer.parseInt(arr.substring(5, 7));
            int monthDiff = Math.abs(bMonth - targetMonth);
            if (monthDiff > 1 && monthDiff < 11) continue;
            Double price = dbl(b, "totalPrice");
            if (price == null) price = dbl(b, "price");
            log.debug("[pricing] résa arrival={} bMonth={} monthDiff={} totalPrice={} price={}", arr, bMonth, monthDiff, dbl(b, "totalPrice"), dbl(b, "price"));
            if (price == null || price <= 0) continue;
            LocalDate a = LocalDate.parse(arr);
            LocalDate d = LocalDate.parse(dep);
            long nights = ChronoUnit.DAYS.between(a, d);
            if (nights <= 0) continue;
            pricesPerNight.add(price / nights);
        }
        log.debug("[pricing] pricesPerNight count={} targetMonth={}", pricesPerNight.size(), targetMonth);
        double basePrice = pricesPerNight.isEmpty() ? 0
                : pricesPerNight.stream().mapToDouble(Double::doubleValue).average().orElse(0);

        // 3. Ajustement saisonnier
        PropertyPricingConfig config = propPricingRepo
                .findByUserIdAndBeds24PropertyId(userId, propId).orElse(null);
        String seasonName = null;
        int seasonAdj = 0;
        if (config != null && config.getZoneId() != null) {
            for (PricingZonePeriod p : periodRepo.findByZoneId(config.getZoneId())) {
                if (isDateInPeriod(start, p)) {
                    seasonName = p.getName();
                    seasonAdj = p.getAdjustmentPercent();
                    break;
                }
            }
        }
        double adjustedPrice = basePrice * (1.0 + seasonAdj / 100.0);

        // 4. Taux d'occupation sur les 60 prochains jours
        LocalDate occFrom = LocalDate.now();
        LocalDate occTo = occFrom.plusDays(60);
        Map<String, String> occParams = new HashMap<>();
        occParams.put("arrivalFrom", occFrom.toString());
        occParams.put("arrivalTo", occTo.toString());
        List<Map<String, Object>> futureBookings = beds24.getBookings(token, occParams).stream()
                .filter(b -> { String s = str(b, "status"); return s != null && (s.equalsIgnoreCase("confirmed") || s.equalsIgnoreCase("new")); })
                .filter(b -> propId.equals(str(b, "propId") != null ? str(b, "propId") : str(b, "propertyId")))
                .collect(Collectors.toList());
        long bookedNights = 0;
        for (Map<String, Object> b : futureBookings) {
            String arr = str(b, "arrival");
            String dep = str(b, "departure");
            if (arr == null || dep == null) continue;
            LocalDate a = LocalDate.parse(arr);
            LocalDate d = LocalDate.parse(dep);
            LocalDate clampStart = a.isBefore(occFrom) ? occFrom : a;
            LocalDate clampEnd = d.isAfter(occTo) ? occTo : d;
            if (clampEnd.isAfter(clampStart)) bookedNights += ChronoUnit.DAYS.between(clampStart, clampEnd);
        }
        double occupancyRate = Math.min(1.0, bookedNights / 60.0);

        // 5. Facteur d'ajustement occupation (interpolation linéaire 30%→80% = -15%→+15%)
        double occFactor;
        if (occupancyRate >= 0.80) occFactor = 1.15;
        else if (occupancyRate <= 0.30) occFactor = 0.85;
        else occFactor = 0.85 + (occupancyRate - 0.30) / 0.50 * 0.30;

        // 5b. Ajustement événements locaux (pourcentages configurables par l'hôte, défaut FAIBLE=+20%, MOYEN=+50%, FORT=+200%, EXCEPTIONNEL=+400%)
        PricingEventImpactConfig impactConfig = eventImpactConfigRepo.findByUserId(userId)
                .orElseGet(PricingEventImpactConfig::new);
        LocalDate analysisEnd = LocalDate.parse(endDate);
        List<LocalEvent> matchingEvents = eventRepo.findByUserIdOrderByStartDateAsc(userId).stream()
                .filter(e -> e.getZoneId() == null || (config != null && e.getZoneId().equals(config.getZoneId())))
                .filter(e -> overlapsAnalysisPeriod(e, start, analysisEnd))
                .collect(Collectors.toList());
        int eventAdj = matchingEvents.stream()
                .mapToInt(e -> switch (e.getImpactLevel()) {
                    case FAIBLE -> impactConfig.getFaiblePercent();
                    case MOYEN -> impactConfig.getMoyenPercent();
                    case FORT -> impactConfig.getFortPercent();
                    case EXCEPTIONNEL -> impactConfig.getExceptionnelPercent();
                })
                .max().orElse(0);
        LocalEvent appliedEvent = matchingEvents.isEmpty() ? null : matchingEvents.stream()
                .max(Comparator.comparingInt(e -> switch (e.getImpactLevel()) { case FAIBLE -> 1; case MOYEN -> 2; case FORT -> 3; case EXCEPTIONNEL -> 4; }))
                .orElse(null);
        String eventName = appliedEvent != null ? appliedEvent.getName() : null;
        double eventFactor = 1.0 + eventAdj / 100.0;

        List<Map<String, Object>> matchingEventsOut = matchingEvents.stream()
                .map(e -> {
                    int pct = switch (e.getImpactLevel()) {
                        case FAIBLE -> impactConfig.getFaiblePercent();
                        case MOYEN -> impactConfig.getMoyenPercent();
                        case FORT -> impactConfig.getFortPercent();
                        case EXCEPTIONNEL -> impactConfig.getExceptionnelPercent();
                    };
                    Map<String, Object> em = new LinkedHashMap<>();
                    em.put("name", e.getName());
                    em.put("startDate", e.getStartDate().toString());
                    em.put("endDate", e.getEndDate().toString());
                    em.put("impactLevel", e.getImpactLevel().name());
                    em.put("adjustmentPercent", pct);
                    em.put("applied", e.getId().equals(appliedEvent.getId()));
                    return em;
                })
                .collect(Collectors.toList());

        double suggestedMid = adjustedPrice * occFactor * eventFactor;
        double suggestedMin = Math.round(suggestedMid * 0.90);
        double suggestedMax = Math.round(suggestedMid * 1.10);

        // 6. Recalage fourchette marché
        Double marketMin = config != null && config.getMarketMin() != null
                ? config.getMarketMin().doubleValue() : null;
        Double marketMax = config != null && config.getMarketMax() != null
                ? config.getMarketMax().doubleValue() : null;
        if (marketMin != null && suggestedMin < marketMin) suggestedMin = marketMin;
        if (marketMax != null && suggestedMax > marketMax) suggestedMax = marketMax;

        // 7. Prix moyen/nuit des réservations sur la période analysée (même logique que menu Revenus)
        Double currentPrice = null;
        try {
            Map<String, String> curParams = new HashMap<>();
            curParams.put("arrivalTo", endDate);
            curParams.put("departureFrom", startDate);
            List<Double> periodPrices = new ArrayList<>();
            for (Map<String, Object> b : beds24.getBookings(token, curParams)) {
                String bPropId = str(b, "propId") != null ? str(b, "propId") : str(b, "propertyId");
                if (!propId.equals(bPropId)) continue;
                String s = str(b, "status");
                if (s == null || (!s.equalsIgnoreCase("confirmed") && !s.equalsIgnoreCase("new"))) continue;
                Double price = dbl(b, "totalPrice");
                if (price == null) price = dbl(b, "price");
                if (price == null || price <= 0) continue;
                String arr = str(b, "arrival");
                String dep = str(b, "departure");
                if (arr == null || dep == null) continue;
                long nights = ChronoUnit.DAYS.between(LocalDate.parse(arr), LocalDate.parse(dep));
                if (nights <= 0) continue;
                periodPrices.add(price / nights);
            }
            if (!periodPrices.isEmpty()) {
                currentPrice = periodPrices.stream().mapToDouble(Double::doubleValue).average().orElse(0);
            }
        } catch (Exception e) {
            log.debug("Could not fetch current period bookings: {}", e.getMessage());
        }

        // 8. Alerte
        String alert = pricesPerNight.isEmpty() ? "no_data"
                : currentPrice == null ? "no_current_price"
                : currentPrice < suggestedMin ? "underpriced"
                : currentPrice > suggestedMax ? "overpriced"
                : "ok";

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("propertyId", propId);
        result.put("startDate", startDate);
        result.put("endDate", endDate);
        result.put("currentPrice", currentPrice);
        result.put("basePrice", pricesPerNight.isEmpty() ? null : (long) Math.round(basePrice));
        result.put("suggestedMin", pricesPerNight.isEmpty() ? null : (long) suggestedMin);
        result.put("suggestedMax", pricesPerNight.isEmpty() ? null : (long) suggestedMax);
        result.put("zoneConfigured", config != null && config.getZoneId() != null);
        result.put("seasonName", seasonName);
        result.put("seasonalAdjustmentPercent", seasonAdj);
        result.put("occupancyRate", Math.round(occupancyRate * 100) / 100.0);
        result.put("occupancyAdjustmentPercent", (int) Math.round((occFactor - 1.0) * 100));
        result.put("eventName", eventName);
        result.put("eventAdjustmentPercent", eventAdj);
        result.put("matchingEvents", matchingEventsOut);
        result.put("marketMin", marketMin);
        result.put("marketMax", marketMax);
        result.put("alert", alert);
        result.put("historicalBookingsCount", propBookings.size());
        return result;
    }

    private boolean overlapsAnalysisPeriod(LocalEvent event, LocalDate start, LocalDate end) {
        if (event.isRecurring()) {
            int evtS = event.getStartDate().getMonthValue() * 100 + event.getStartDate().getDayOfMonth();
            int evtE = event.getEndDate().getMonthValue()   * 100 + event.getEndDate().getDayOfMonth();
            int anaS = start.getMonthValue() * 100 + start.getDayOfMonth();
            int anaE = end.getMonthValue()   * 100 + end.getDayOfMonth();
            return !(evtE < anaS || evtS > anaE);
        }
        return !event.getEndDate().isBefore(start) && !event.getStartDate().isAfter(end);
    }

    private boolean isDateInPeriod(LocalDate date, PricingZonePeriod p) {
        int startOrd = p.getStartMonth() * 100 + p.getStartDay();
        int endOrd   = p.getEndMonth()   * 100 + p.getEndDay();
        int dateOrd  = date.getMonthValue() * 100 + date.getDayOfMonth();
        return startOrd <= endOrd ? (dateOrd >= startOrd && dateOrd <= endOrd)
                                  : (dateOrd >= startOrd || dateOrd <= endOrd);
    }

    private String str(Map<String, Object> m, String k) {
        Object v = m.get(k); return v != null ? v.toString() : null;
    }

    private Double dbl(Map<String, Object> m, String k) {
        Object v = m.get(k);
        if (v == null) return null;
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return null; }
    }
}
