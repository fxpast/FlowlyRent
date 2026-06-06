package com.flowlyrent.repository;

import com.flowlyrent.model.HousekeepingTask;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
