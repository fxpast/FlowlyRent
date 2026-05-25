package com.flowlyrent.repository;

import com.flowlyrent.model.Booking;
import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.Property;
import com.flowlyrent.model.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HousekeepingTaskRepository extends JpaRepository<HousekeepingTask, Long> {
    List<HousekeepingTask> findByPropertyOrderByScheduledDateAsc(Property property);
    List<HousekeepingTask> findByPropertyAndStatusOrderByScheduledDateAsc(Property property, TaskStatus status);
    List<HousekeepingTask> findByPropertyAndScheduledDateBetween(Property property, LocalDate from, LocalDate to);
    Optional<HousekeepingTask> findByBooking(Booking booking);

    List<HousekeepingTask> findByProperty_AppUser_IdAndScheduledDateBetweenOrderByScheduledDateAsc(
            Long userId, LocalDate from, LocalDate to);
}
