package com.flowlyrent.repository;

import com.flowlyrent.model.AdminNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AdminNotificationRepository extends JpaRepository<AdminNotification, Long> {

    List<AdminNotification> findAllByOrderBySentAtDesc();

    // Notifications visibles pour un user : ciblées vers tous (targetUsers vide) OU spécifiquement ce user
    @Query("SELECT DISTINCT n FROM AdminNotification n LEFT JOIN n.targetUsers tu WHERE tu IS NULL OR tu.id = :userId ORDER BY n.sentAt DESC")
    List<AdminNotification> findVisibleForUser(@Param("userId") Long userId);

    // Non-lues parmi les notifications visibles pour ce user
    @Query("SELECT COUNT(DISTINCT n) FROM AdminNotification n LEFT JOIN n.targetUsers tu WHERE (tu IS NULL OR tu.id = :userId) AND n.id NOT IN (SELECT r.notification.id FROM AdminNotificationRead r WHERE r.user.id = :userId)")
    long countUnreadByUserId(@Param("userId") Long userId);
}
