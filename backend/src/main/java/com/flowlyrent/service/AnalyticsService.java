package com.flowlyrent.service;

import com.flowlyrent.dto.SuperAdminStatsDTO;
import com.flowlyrent.model.AnalyticsEvent;
import com.flowlyrent.model.enums.AnalyticsEventType;
import com.flowlyrent.model.enums.SubscriptionPlan;
import com.flowlyrent.repository.AnalyticsEventRepository;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.FaqSuggestionRepository;
import com.flowlyrent.repository.HousekeepingTaskRepository;
import com.flowlyrent.repository.LinenItemRepository;
import com.flowlyrent.repository.QontoAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    @Value("${app.analytics.internal-emails:}")
    private String internalEmailsConfig;

    private final AnalyticsEventRepository analyticsRepo;
    private final AppUserRepository userRepo;
    private final QontoAccountRepository qontoAccountRepo;
    private final HousekeepingTaskRepository housekeepingTaskRepo;
    private final LinenItemRepository linenItemRepo;
    private final FaqSuggestionRepository faqSuggestionRepo;

    private List<String> getInternalEmails() {
        if (internalEmailsConfig == null || internalEmailsConfig.isBlank()) return List.of();
        return Arrays.stream(internalEmailsConfig.split(","))
            .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
    }

    public void record(AnalyticsEventType type, Long userId, String page, String ip) {
        AnalyticsEvent event = new AnalyticsEvent();
        event.setType(type);
        event.setUserId(userId);
        event.setPage(page);
        event.setIpAddress(ip);
        analyticsRepo.save(event);
    }

    public SuperAdminStatsDTO buildStats() {
        LocalDateTime now    = LocalDateTime.now();
        LocalDateTime minus7  = now.minusDays(7);
        LocalDateTime minus30 = now.minusDays(30);

        List<Long> excludeIds = userRepo.findIdsByEmailIn(getInternalEmails());
        if (excludeIds.isEmpty()) excludeIds = List.of(-1L);

        List<SuperAdminStatsDTO.PageStatDTO> topPages = analyticsRepo
            .findTopPagesExcluding(AnalyticsEventType.PAGE_VIEW.name(), minus30, excludeIds, PageRequest.of(0, 10))
            .stream()
            .map(row -> SuperAdminStatsDTO.PageStatDTO.builder()
                .page((String) row[0])
                .count(((Number) row[1]).longValue())
                .build())
            .toList();

        List<SuperAdminStatsDTO.DailyStatDTO> userGrowth = userRepo
            .findDailyNewUsersExcluding(minus30, excludeIds)
            .stream()
            .map(row -> SuperAdminStatsDTO.DailyStatDTO.builder()
                .date(row[0].toString())
                .count(((Number) row[1]).longValue())
                .build())
            .toList();

        List<SuperAdminStatsDTO.DailyStatDTO> loginsChart = analyticsRepo
            .findDailyStatsExcluding(AnalyticsEventType.LOGIN.name(), minus30, excludeIds)
            .stream()
            .map(row -> SuperAdminStatsDTO.DailyStatDTO.builder()
                .date(row[0].toString())
                .count(((Number) row[1]).longValue())
                .build())
            .toList();

        List<SuperAdminStatsDTO.PlanStatDTO> planBreakdown = userRepo
            .countByPlanExcluding(excludeIds)
            .stream()
            .map(row -> SuperAdminStatsDTO.PlanStatDTO.builder()
                .plan(((SubscriptionPlan) row[0]).name())
                .count(((Number) row[1]).longValue())
                .build())
            .toList();

        return SuperAdminStatsDTO.builder()
            .totalUsers(userRepo.countExcluding(excludeIds))
            .newUsersLast7Days(userRepo.countByCreatedAtAfterExcluding(minus7, excludeIds))
            .newUsersLast30Days(userRepo.countByCreatedAtAfterExcluding(minus30, excludeIds))
            .loginsLast7Days(analyticsRepo.countByTypeAndCreatedAtAfterExcluding(AnalyticsEventType.LOGIN, minus7, excludeIds))
            .loginsLast30Days(analyticsRepo.countByTypeAndCreatedAtAfterExcluding(AnalyticsEventType.LOGIN, minus30, excludeIds))
            .clicksLast7Days(analyticsRepo.countByTypeAndCreatedAtAfterExcluding(AnalyticsEventType.CLICK, minus7, excludeIds))
            .clicksLast30Days(analyticsRepo.countByTypeAndCreatedAtAfterExcluding(AnalyticsEventType.CLICK, minus30, excludeIds))
            .anonymousVisitsLast7Days(analyticsRepo.countAnonymousByTypeAndCreatedAtAfter(AnalyticsEventType.PAGE_VIEW, minus7))
            .anonymousVisitsLast30Days(analyticsRepo.countAnonymousByTypeAndCreatedAtAfter(AnalyticsEventType.PAGE_VIEW, minus30))
            .topPages(topPages)
            .userGrowthLast30Days(userGrowth)
            .loginsChartLast30Days(loginsChart)
            .planBreakdown(planBreakdown)
            .qontoConnectedUsers(qontoAccountRepo.countByConnectedTrue())
            .housekeepingActiveUsers(housekeepingTaskRepo.countDistinctUsers())
            .linenActiveUsers(linenItemRepo.countDistinctUsers())
            .pendingFaqSuggestions(faqSuggestionRepo.count())
            .build();
    }
}
