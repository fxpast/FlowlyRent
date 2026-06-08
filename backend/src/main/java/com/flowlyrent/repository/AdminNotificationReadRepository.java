package com.flowlyrent.repository;

import com.flowlyrent.model.AdminNotificationRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface AdminNotificationReadRepository extends JpaRepository<AdminNotificationRead, Long> {

    boolean existsByNotification_IdAndUser_Id(Long notifId, Long userId);

    List<AdminNotificationRead> findByUser_Id(Long userId);

    long countByNotification_Id(Long notifId);

    @Modifying
    @Transactional
    void deleteByNotification_Id(Long notifId);
}
