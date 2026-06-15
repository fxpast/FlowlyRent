package com.flowlyrent.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SuperAdminStatsDTO {

    private long totalUsers;
    private long newUsersLast7Days;
    private long newUsersLast30Days;

    private long loginsLast7Days;
    private long loginsLast30Days;

    private long clicksLast7Days;
    private long clicksLast30Days;

    private long anonymousVisitsLast7Days;
    private long anonymousVisitsLast30Days;

    private List<PageStatDTO> topPages;
    private List<DailyStatDTO> userGrowthLast30Days;
    private List<DailyStatDTO> loginsChartLast30Days;

    private List<PlanStatDTO> planBreakdown;

    private long qontoConnectedUsers;
    private long housekeepingActiveUsers;
    private long linenActiveUsers;
    private long pendingFaqSuggestions;

    @Data
    @Builder
    public static class PageStatDTO {
        private String page;
        private long count;
    }

    @Data
    @Builder
    public static class DailyStatDTO {
        private String date;
        private long count;
    }

    @Data
    @Builder
    public static class PlanStatDTO {
        private String plan;
        private long count;
    }
}
