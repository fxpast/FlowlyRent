package com.flowlyrent.repository;

import com.flowlyrent.model.TaskPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskPhotoRepository extends JpaRepository<TaskPhoto, Long> {
    List<TaskPhoto> findByTaskIdOrderByUploadedAtAsc(Long taskId);
    void deleteByTaskId(Long taskId);
}
