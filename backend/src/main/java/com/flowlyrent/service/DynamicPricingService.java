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

import java.time.Duration;
import java.time.Instant;
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

    private record DaySlot(int percent, String eventName, String impactLevel) {}
    private record PeriodBooking(LocalDate arrival, LocalDate departure, double pricePerNight) {}

    @SuppressWarnings("unchecked")
    public Map<String, Object> calculateSuggestion(
            Long userId, Beds24Account account,
            String propId, String startDate, String endDate) throws Exception {

        Instant t0 = Instant.now();
        log.info("[pricing] BEGIN propId={} {}→{}", propId, startDate, endDate);
        LocalDate start = LocalDate.parse(startDate);
        String token = beds24.tokenFor(account);
        log.info("[pricing] propId={} token OK (+{}ms)", propId, Duration.between(t0, Instant.now()).toMillis());

        // 1. Historique 24 mois pour ce logement
        // Pas de filtre status côté API — sensible à la casse et peu fiable en v2, on filtre en Java
        Map<String, String> histParams = new HashMap<>();
        histParams.put("propId", propId);
        histParams.put("arrivalFrom", start.minusYears(2).toString());
        histParams.put("arrivalTo", start.minusDays(1).toString());
        Instant tHist = Instant.now();
        List<Map<String, Object>> allHistBookings = beds24.getBookings(token, histParams);
        log.info("[pricing] propId={} step=history fetched={} (+{}ms, total+{}ms)", propId, allHistBookings.size(),
                Duration.between(tHist, Instant.now()).toMillis(), Duration.between(t0, Instant.now()).toMillis());
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
        occParams.put("propId", propId);
        occParams.put("arrivalFrom", occFrom.toString());
        occParams.put("arrivalTo", occTo.toString());
        Instant tOcc = Instant.now();
        List<Map<String, Object>> occRaw = beds24.getBookings(token, occParams);
        log.info("[pricing] propId={} step=occupancy fetched={} (+{}ms, total+{}ms)", propId, occRaw.size(),
                Duration.between(tOcc, Instant.now()).toMillis(), Duration.between(t0, Instant.now()).toMillis());
        List<Map<String, Object>> futureBookings = occRaw.stream()
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

        // 6. Recalage fourchette marché
        Double marketMin = config != null && config.getMarketMin() != null
                ? config.getMarketMin().doubleValue() : null;
        Double marketMax = config != null && config.getMarketMax() != null
                ? config.getMarketMax().doubleValue() : null;

        // 7. Réservations sur la période analysée (même logique que menu Revenus), gardées par séjour
        //    pour calculer un prix actuel propre à chaque segment (étape 9)
        List<PeriodBooking> periodBookings = new ArrayList<>();
        Instant tCur = Instant.now();
        try {
            Map<String, String> curParams = new HashMap<>();
            curParams.put("propId", propId);
            curParams.put("arrivalTo", endDate);
            curParams.put("departureFrom", startDate);
            List<Map<String, Object>> curRaw = beds24.getBookings(token, curParams);
            log.info("[pricing] propId={} step=currentPeriod fetched={} (+{}ms, total+{}ms)", propId, curRaw.size(),
                    Duration.between(tCur, Instant.now()).toMillis(), Duration.between(t0, Instant.now()).toMillis());
            for (Map<String, Object> b : curRaw) {
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
                LocalDate a = LocalDate.parse(arr);
                LocalDate d = LocalDate.parse(dep);
                long nights = ChronoUnit.DAYS.between(a, d);
                if (nights <= 0) continue;
                periodBookings.add(new PeriodBooking(a, d, price / nights));
            }
        } catch (Exception e) {
            log.warn("[pricing] propId={} step=currentPeriod ÉCHEC (+{}ms, total+{}ms) {}: {}", propId,
                    Duration.between(tCur, Instant.now()).toMillis(), Duration.between(t0, Instant.now()).toMillis(),
                    e.getClass().getSimpleName(), e.getMessage());
        }

        // 8. Ajustement événements locaux par jour (pourcentages configurables par l'hôte, défaut
        //    FAIBLE=+20%, MOYEN=+50%, FORT=+200%, EXCEPTIONNEL=+400%) — un même événement peut ne
        //    couvrir qu'une partie de la période analysée, le reste reste au tarif "normal"
        PricingEventImpactConfig impactConfig = eventImpactConfigRepo.findByUserId(userId)
                .orElseGet(PricingEventImpactConfig::new);
        LocalDate analysisEnd = LocalDate.parse(endDate);
        List<LocalEvent> matchingEvents = eventRepo.findByUserIdOrderByStartDateAsc(userId).stream()
                .filter(e -> e.getZoneId() == null || (config != null && e.getZoneId().equals(config.getZoneId())))
                .filter(e -> overlapsAnalysisPeriod(e, start, analysisEnd))
                .collect(Collectors.toList());

        List<LocalDate> days = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(analysisEnd); d = d.plusDays(1)) days.add(d);

        List<DaySlot> perDay = new ArrayList<>();
        for (LocalDate d : days) {
            int bestPct = 0;
            String bestName = null;
            String bestLevel = null;
            for (LocalEvent e : matchingEvents) {
                if (!coversDay(e, d)) continue;
                int pct = percentFor(e.getImpactLevel(), impactConfig);
                if (pct > bestPct) { bestPct = pct; bestName = e.getName(); bestLevel = e.getImpactLevel().name(); }
            }
            perDay.add(new DaySlot(bestPct, bestName, bestLevel));
        }

        // 9. Regroupement en segments (jours consécutifs avec le même événement appliqué, ou aucun)
        //    et calcul d'une fourchette + d'un prix actuel propres à chaque segment
        List<Map<String, Object>> segments = new ArrayList<>();
        int segStartIdx = 0;
        for (int i = 1; i <= days.size(); i++) {
            if (i != days.size() && perDay.get(i).equals(perDay.get(segStartIdx))) continue;

            LocalDate segStart = days.get(segStartIdx);
            LocalDate segEnd = days.get(i - 1);
            DaySlot slot = perDay.get(segStartIdx);

            double segMid = adjustedPrice * occFactor * (1.0 + slot.percent() / 100.0);
            double segMin = Math.round(segMid * 0.90);
            double segMax = Math.round(segMid * 1.10);
            if (marketMin != null && segMin < marketMin) segMin = marketMin;
            if (marketMax != null && segMax > marketMax) segMax = marketMax;

            List<Double> segPrices = periodBookings.stream()
                    .filter(pb -> !pb.arrival().isAfter(segEnd) && pb.departure().isAfter(segStart))
                    .map(PeriodBooking::pricePerNight)
                    .collect(Collectors.toList());
            Double segCurrentPrice = segPrices.isEmpty() ? null
                    : segPrices.stream().mapToDouble(Double::doubleValue).average().orElse(0);

            String segAlert = pricesPerNight.isEmpty() ? "no_data"
                    : segCurrentPrice == null ? "no_current_price"
                    : segCurrentPrice < segMin ? "underpriced"
                    : segCurrentPrice > segMax ? "overpriced"
                    : "ok";

            Map<String, Object> segMap = new LinkedHashMap<>();
            segMap.put("startDate", segStart.toString());
            segMap.put("endDate", segEnd.toString());
            segMap.put("eventName", slot.eventName());
            segMap.put("impactLevel", slot.impactLevel());
            segMap.put("eventAdjustmentPercent", slot.percent());
            segMap.put("currentPrice", segCurrentPrice);
            segMap.put("suggestedMin", pricesPerNight.isEmpty() ? null : (long) segMin);
            segMap.put("suggestedMax", pricesPerNight.isEmpty() ? null : (long) segMax);
            segMap.put("alert", segAlert);
            segments.add(segMap);

            segStartIdx = i;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("propertyId", propId);
        result.put("startDate", startDate);
        result.put("endDate", endDate);
        result.put("basePrice", pricesPerNight.isEmpty() ? null : (long) Math.round(basePrice));
        result.put("zoneConfigured", config != null && config.getZoneId() != null);
        result.put("seasonName", seasonName);
        result.put("seasonalAdjustmentPercent", seasonAdj);
        result.put("occupancyRate", Math.round(occupancyRate * 100) / 100.0);
        result.put("occupancyAdjustmentPercent", (int) Math.round((occFactor - 1.0) * 100));
        result.put("marketMin", marketMin);
        result.put("marketMax", marketMax);
        result.put("historicalBookingsCount", propBookings.size());
        result.put("segments", segments);
        log.info("[pricing] propId={} END days={} segments={} (total={}ms)", propId, days.size(), segments.size(),
                Duration.between(t0, Instant.now()).toMillis());
        return result;
    }

    private int percentFor(ImpactLevel level, PricingEventImpactConfig cfg) {
        return switch (level) {
            case FAIBLE -> cfg.getFaiblePercent();
            case MOYEN -> cfg.getMoyenPercent();
            case FORT -> cfg.getFortPercent();
            case EXCEPTIONNEL -> cfg.getExceptionnelPercent();
        };
    }

    private boolean coversDay(LocalEvent event, LocalDate day) {
        if (event.isRecurring()) {
            int evtS = event.getStartDate().getMonthValue() * 100 + event.getStartDate().getDayOfMonth();
            int evtE = event.getEndDate().getMonthValue()   * 100 + event.getEndDate().getDayOfMonth();
            int dayOrd = day.getMonthValue() * 100 + day.getDayOfMonth();
            return evtS <= evtE ? (dayOrd >= evtS && dayOrd <= evtE) : (dayOrd >= evtS || dayOrd <= evtE);
        }
        return !day.isBefore(event.getStartDate()) && !day.isAfter(event.getEndDate());
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
