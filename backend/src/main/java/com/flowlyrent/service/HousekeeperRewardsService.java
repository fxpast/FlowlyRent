package com.flowlyrent.service;

import com.flowlyrent.model.HousekeeperProfile;
import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.repository.HousekeepingTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Points/badges/niveau/classement prestataire — tout est calculé à la volée
 * depuis HousekeepingTask (jamais stocké), même principe que
 * HousekeepingReportService.costSummary(). Conséquence assumée : les points
 * peuvent redescendre si une tâche DONE est modifiée/supprimée après coup.
 */
@Service
@RequiredArgsConstructor
public class HousekeeperRewardsService {

    private static final int POINTS_PER_CLEAN_TASK = 10;
    private static final int POINTS_PER_REPORTED_INCIDENT = 2;

    private final HousekeepingTaskRepository taskRepo;

    public Map<String, Object> computeMyRewards(HousekeeperProfile profile) {
        long doneTotal = taskRepo.countByHousekeeper_IdAndStatus(profile.getId(), TaskStatus.DONE);
        long doneNoIncident = taskRepo.countByHousekeeper_IdAndStatusAndHasIncidentFalse(profile.getId(), TaskStatus.DONE);
        long doneReportedIncident = taskRepo.countByHousekeeper_IdAndStatusAndHasIncidentTrueAndReportCommentIsNotNull(profile.getId(), TaskStatus.DONE);
        long reportsWithPhotos = taskRepo.countReportsWithPhotos(profile.getId());

        int points = (int) (doneNoIncident * POINTS_PER_CLEAN_TASK + doneReportedIncident * POINTS_PER_REPORTED_INCIDENT);

        List<HousekeepingTask> last20Done = taskRepo.findTop20ByHousekeeper_IdAndStatusOrderByCompletedAtDesc(profile.getId(), TaskStatus.DONE);
        boolean zeroIncidentStreak = last20Done.size() >= 20
                && last20Done.stream().noneMatch(t -> Boolean.TRUE.equals(t.getHasIncident()));

        List<Map<String, Object>> badges = new ArrayList<>();
        badges.add(badge("first_missions", doneTotal >= 10));
        badges.add(badge("regular", doneTotal >= 50));
        badges.add(badge("veteran", doneTotal >= 100));
        badges.add(badge("zero_incident", zeroIncidentStreak));
        badges.add(badge("reliable_reporter", reportsWithPhotos >= 10));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("points", points);
        result.putAll(computeLevel(points));
        result.put("badges", badges);
        result.put("leaderboard", computeLeaderboard(profile, points));
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
        if (points >= 700)      { key = "PLATINUM"; nextThreshold = -1; }
        else if (points >= 300) { key = "GOLD";      nextThreshold = 700; }
        else if (points >= 100) { key = "SILVER";    nextThreshold = 300; }
        else                    { key = "BRONZE";    nextThreshold = 100; }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("levelKey", key);
        m.put("nextLevelThreshold", nextThreshold);
        return m;
    }

    /** Classement des prestataires du même hôte, scopé (pas de comparaison cross-tenant). */
    private List<Map<String, Object>> computeLeaderboard(HousekeeperProfile profile, int myExactPoints) {
        Long hostId = profile.getUser().getId();
        List<Object[]> rows = taskRepo.countDoneGroupedByHousekeeperForHost(hostId);

        List<Map<String, Object>> leaderboard = new ArrayList<>();
        for (Object[] row : rows) {
            Long housekeeperId = (Long) row[0];
            String name = (String) row[1];
            long doneCount = (Long) row[2];
            boolean isMe = housekeeperId.equals(profile.getId());
            // Approximation pour les collègues (pas de détail incident dans la requête groupée) —
            // toujours exact pour la ligne "moi", recalculée précisément ci-dessus.
            int pts = isMe ? myExactPoints : (int) (doneCount * POINTS_PER_CLEAN_TASK);

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("housekeeperId", housekeeperId);
            entry.put("name", name);
            entry.put("points", pts);
            entry.put("isMe", isMe);
            leaderboard.add(entry);
        }
        leaderboard.sort((a, b) -> Integer.compare((int) b.get("points"), (int) a.get("points")));
        return leaderboard;
    }
}
