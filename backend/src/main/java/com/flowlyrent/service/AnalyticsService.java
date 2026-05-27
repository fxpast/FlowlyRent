package com.flowlyrent.service;

import com.flowlyrent.dto.SuperAdminStatsDTO;
import com.flowlyrent.model.AnalyticsEvent;
import com.flowlyrent.model.enums.AnalyticsEventType;
import com.flowlyrent.repository.AnalyticsEventRepository;
import com.flowlyrent.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final AnalyticsEventRepository analyticsRepo;
    private final AppUserRepository userRepo;

    public void record(AnalyticsEventType type, Long userId, String page, String ip) {
        AnalyticsEvent event = new AnalyticsEvent();
        event.setType(type);
        event.setUserId(userId);
        event.setPage(page);
        event.setIpAddress(ip);
        analyticsRepo.save(event);
    }

    public SuperAdminStatsDTO buildStats() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime minus7  = now.minusDays(7);
        LocalDateTime minus30 = now.minusDays(30);

        List<SuperAdminStatsDTO.PageStatDTO> topPages = analyticsRepo
            .findTopPages(AnalyticsEventType.PAGE_VIEW.name(), minus30, PageRequest.of(0, 10))
            .stream()
            .map(row -> SuperAdminStatsDTO.PageStatDTO.builder()
                .page((String) row[0])
                .count(((Number) row[1]).longValue())
                .build())
            .toList();

        List<SuperAdminStatsDTO.DailyStatDTO> userGrowth = userRepo.findDailyNewUsers(minus30)
            .stream()
            .map(row -> SuperAdminStatsDTO.DailyStatDTO.builder()
                .date(row[0].toString())
                .count(((Number) row[1]).longValue())
                .build())
            .toList();

        List<SuperAdminStatsDTO.DailyStatDTO> loginsChart = analyticsRepo
            .findDailyStats(AnalyticsEventType.LOGIN.name(), minus30)
            .stream()
            .map(row -> SuperAdminStatsDTO.DailyStatDTO.builder()
                .date(row[0].toString())
                .count(((Number) row[1]).longValue())
                .build())
            .toList();

        return SuperAdminStatsDTO.builder()
            .totalUsers(userRepo.count())
            .newUsersLast7Days(userRepo.countByCreatedAtAfter(minus7))
            .newUsersLast30Days(userRepo.countByCreatedAtAfter(minus30))
            .loginsLast7Days(analyticsRepo.countByTypeAndCreatedAtAfter(AnalyticsEventType.LOGIN, minus7))
            .loginsLast30Days(analyticsRepo.countByTypeAndCreatedAtAfter(AnalyticsEventType.LOGIN, minus30))
            .clicksLast7Days(analyticsRepo.countByTypeAndCreatedAtAfter(AnalyticsEventType.CLICK, minus7))
            .clicksLast30Days(analyticsRepo.countByTypeAndCreatedAtAfter(AnalyticsEventType.CLICK, minus30))
            .topPages(topPages)
            .userGrowthLast30Days(userGrowth)
            .loginsChartLast30Days(loginsChart)
            .build();
    }
}
