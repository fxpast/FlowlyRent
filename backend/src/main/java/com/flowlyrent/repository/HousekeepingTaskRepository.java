package com.flowlyrent.repository;

import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface HousekeepingTaskRepository extends JpaRepository<HousekeepingTask, Long> {

    List<HousekeepingTask> findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
            Long userId, LocalDateTime from, LocalDateTime to);

    List<HousekeepingTask> findByUserIdAndBeds24PropertyIdAndScheduledDateBetweenOrderByScheduledDateAsc(
            Long userId, String beds24PropertyId, LocalDateTime from, LocalDateTime to);

    List<HousekeepingTask> findByUserIdAndStaff_IdOrderByScheduledDateAsc(Long userId, Long staffId);

    List<HousekeepingTask> findByHousekeeper_IdAndScheduledDateGreaterThanEqualOrderByScheduledDateAsc(
            Long housekeeperId, LocalDateTime from);

    List<HousekeepingTask> findByBeds24BookingIdOrderByScheduledDateAsc(String beds24BookingId);

    boolean existsByBeds24BookingId(String beds24BookingId);

    List<HousekeepingTask> findByUserIdOrderByScheduledDateAsc(Long userId);

    @Query("SELECT COUNT(DISTINCT t.user.id) FROM HousekeepingTask t")
    long countDistinctUsers();

    // ─── Gamification prestataires ──────────────────────────────────────────
    // Requêtes scalaires uniquement : HousekeepingTask.housekeeper est en
    // FetchType.EAGER, un List<HousekeepingTask> sur un classement multi-
    // prestataires déclencherait un SELECT N+1 par prestataire distinct.

    long countByHousekeeper_IdAndStatus(Long housekeeperId, TaskStatus status);

    long countByHousekeeper_IdAndStatusAndHasIncidentFalse(Long housekeeperId, TaskStatus status);

    long countByHousekeeper_IdAndStatusAndHasIncidentTrueAndReportCommentIsNotNull(Long housekeeperId, TaskStatus status);

    @Query("SELECT t.housekeeper.id, t.housekeeper.name, COUNT(t) FROM HousekeepingTask t " +
           "WHERE t.housekeeper.user.id = :hostId AND t.status = 'DONE' " +
           "GROUP BY t.housekeeper.id, t.housekeeper.name ORDER BY COUNT(t) DESC")
    List<Object[]> countDoneGroupedByHousekeeperForHost(@Param("hostId") Long hostId);

    List<HousekeepingTask> findTop20ByHousekeeper_IdAndStatusOrderByCompletedAtDesc(Long housekeeperId, TaskStatus status);

    @Query("SELECT COUNT(DISTINCT t) FROM HousekeepingTask t, TaskPhoto p " +
           "WHERE p.task = t AND t.housekeeper.id = :housekeeperId " +
           "AND t.status = 'DONE' AND t.reportComment IS NOT NULL")
    long countReportsWithPhotos(@Param("housekeeperId") Long housekeeperId);
}
