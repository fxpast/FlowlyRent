package com.flowlyrent.repository;

import com.flowlyrent.model.TaskLinenUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TaskLinenUsageRepository extends JpaRepository<TaskLinenUsage, Long> {

    List<TaskLinenUsage> findByTask_Id(Long taskId);

    @Modifying
    @Transactional
    @Query("DELETE FROM TaskLinenUsage u WHERE u.task.id = :taskId")
    void deleteByTaskId(@Param("taskId") Long taskId);

    @Modifying
    @Transactional
    @Query("DELETE FROM TaskLinenUsage u WHERE u.linenItem.id = :linenItemId")
    void deleteByLinenItemId(@Param("linenItemId") Long linenItemId);
}
