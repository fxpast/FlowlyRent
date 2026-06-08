package com.flowlyrent.repository;

import com.flowlyrent.model.AdminNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AdminNotificationRepository extends JpaRepository<AdminNotification, Long> {

    List<AdminNotification> findAllByOrderBySentAtDesc();

    @Query("SELECT COUNT(n) FROM AdminNotification n WHERE n.id NOT IN " +
           "(SELECT r.notification.id FROM AdminNotificationRead r WHERE r.user.id = :userId)")
    long countUnreadByUserId(@Param("userId") Long userId);
}
