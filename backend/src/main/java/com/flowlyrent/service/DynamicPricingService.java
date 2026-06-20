package com.flowlyrent.service;

import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.PricingZonePeriod;
import com.flowlyrent.model.PropertyPricingConfig;
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

    @SuppressWarnings("unchecked")
    public Map<String, Object> calculateSuggestion(
            Long userId, Beds24Account account,
            String propId, String startDate, String endDate) throws Exception {

        LocalDate start = LocalDate.parse(startDate);
        String token = beds24.tokenFor(account);

        // 1. Historique 12 mois pour ce logement
        Map<String, String> histParams = new HashMap<>();
        histParams.put("arrivalFrom", start.minusYears(1).toString());
        histParams.put("arrivalTo", start.minusDays(1).toString());
        histParams.put("status", "confirmed");
        List<Map<String, Object>> propBookings = beds24.getBookings(token, histParams).stream()
                .filter(b -> propId.equals(str(b, "propId")))
                .collect(Collectors.toList());

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
            if (price == null || price <= 0) continue;
            LocalDate a = LocalDate.parse(arr);
            LocalDate d = LocalDate.parse(dep);
            long nights = ChronoUnit.DAYS.between(a, d);
            if (nights <= 0) continue;
            pricesPerNight.add(price / nights);
        }
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
        occParams.put("status", "confirmed");
        List<Map<String, Object>> futureBookings = beds24.getBookings(token, occParams).stream()
                .filter(b -> propId.equals(str(b, "propId")))
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

        double suggestedMid = adjustedPrice * occFactor;
        double suggestedMin = Math.round(suggestedMid * 0.90);
        double suggestedMax = Math.round(suggestedMid * 1.10);

        // 6. Recalage fourchette marché
        Double marketMin = config != null && config.getMarketMin() != null
                ? config.getMarketMin().doubleValue() : null;
        Double marketMax = config != null && config.getMarketMax() != null
                ? config.getMarketMax().doubleValue() : null;
        if (marketMin != null && suggestedMin < marketMin) suggestedMin = marketMin;
        if (marketMax != null && suggestedMax > marketMax) suggestedMax = marketMax;

        // 7. Prix actuel depuis le calendrier Beds24
        Double currentPrice = null;
        try {
            Map<String, String> calParams = new HashMap<>();
            calParams.put("startDate", startDate);
            calParams.put("endDate", startDate);
            List<Map<String, Object>> calData = beds24.getCalendar(token, calParams);
            for (Map<String, Object> room : calData) {
                if (propId.equals(str(room, "propertyId"))) {
                    List<Map<String, Object>> cal = (List<Map<String, Object>>) room.get("calendar");
                    if (cal != null && !cal.isEmpty()) {
                        Object p1 = cal.get(0).get("price1");
                        if (p1 != null) currentPrice = Double.parseDouble(p1.toString());
                    }
                    break;
                }
            }
        } catch (Exception e) {
            log.debug("Could not fetch current price from calendar: {}", e.getMessage());
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
        result.put("seasonName", seasonName);
        result.put("seasonalAdjustmentPercent", seasonAdj);
        result.put("occupancyRate", Math.round(occupancyRate * 100) / 100.0);
        result.put("occupancyAdjustmentPercent", (int) Math.round((occFactor - 1.0) * 100));
        result.put("marketMin", marketMin);
        result.put("marketMax", marketMax);
        result.put("alert", alert);
        result.put("historicalBookingsCount", propBookings.size());
        return result;
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
