package com.flowlyrent.repository;

import com.flowlyrent.model.TaskPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TaskPhotoRepository extends JpaRepository<TaskPhoto, Long> {
    List<TaskPhoto> findByTaskIdOrderByUploadedAtAsc(Long taskId);

    @Modifying
    @Transactional
    void deleteByTaskId(Long taskId);
}
