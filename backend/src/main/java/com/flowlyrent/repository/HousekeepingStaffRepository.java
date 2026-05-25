package com.flowlyrent.repository;

import com.flowlyrent.model.HousekeepingStaff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HousekeepingStaffRepository extends JpaRepository<HousekeepingStaff, Long> {
    List<HousekeepingStaff> findByUserIdAndActiveTrue(Long userId);
}
