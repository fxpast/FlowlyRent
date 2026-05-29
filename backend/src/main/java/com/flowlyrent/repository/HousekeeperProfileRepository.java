package com.flowlyrent.repository;

import com.flowlyrent.model.HousekeeperProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HousekeeperProfileRepository extends JpaRepository<HousekeeperProfile, Long> {
    List<HousekeeperProfile> findByUserIdAndActiveTrueOrderByNameAsc(Long userId);
    Optional<HousekeeperProfile> findByIdAndUserId(Long id, Long userId);
    Optional<HousekeeperProfile> findByLinkedUserId(Long linkedUserId);
}
