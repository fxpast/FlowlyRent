package com.flowlyrent.repository;

import com.flowlyrent.model.HousekeeperProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface HousekeeperProfileRepository extends JpaRepository<HousekeeperProfile, Long> {
    List<HousekeeperProfile> findByUserIdAndActiveTrueOrderByNameAsc(Long userId);
    Optional<HousekeeperProfile> findByIdAndUserId(Long id, Long userId);
    Optional<HousekeeperProfile> findByLinkedUserId(Long linkedUserId);

    /** Charge le profil ET l'utilisateur hôte en une seule requête (évite le lazy loading). */
    @Query("SELECT p FROM HousekeeperProfile p JOIN FETCH p.user WHERE p.linkedUser.id = :linkedUserId")
    Optional<HousekeeperProfile> findByLinkedUserIdWithUser(@Param("linkedUserId") Long linkedUserId);
}
