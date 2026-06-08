package com.flowlyrent.repository;

import com.flowlyrent.model.LinenMovement;
import com.flowlyrent.model.enums.MovementDirection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface LinenMovementRepository extends JpaRepository<LinenMovement, Long> {

    @Query("SELECT m FROM LinenMovement m JOIN FETCH m.linenItem WHERE m.linenItem.beds24PropertyId = :propId AND m.user.id = :userId ORDER BY m.movementDate DESC, m.createdAt DESC")
    List<LinenMovement> findByPropertyAndUser(@Param("propId") String beds24PropertyId, @Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(m.quantity), 0) FROM LinenMovement m WHERE m.linenItem.id = :itemId AND m.direction = :direction")
    long sumByItemAndDirection(@Param("itemId") Long itemId, @Param("direction") MovementDirection direction);

    Optional<LinenMovement> findByIdAndUser_Id(Long id, Long userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM LinenMovement m WHERE m.linenItem.id = :linenItemId")
    void deleteByLinenItemId(@Param("linenItemId") Long linenItemId);
}
