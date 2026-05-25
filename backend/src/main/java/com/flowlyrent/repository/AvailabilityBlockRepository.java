package com.flowlyrent.repository;

import com.flowlyrent.model.AvailabilityBlock;
import com.flowlyrent.model.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface AvailabilityBlockRepository extends JpaRepository<AvailabilityBlock, Long> {
    List<AvailabilityBlock> findByProperty(Property property);

    @Query("SELECT b FROM AvailabilityBlock b WHERE b.property = :property " +
           "AND b.startDate <= :endDate AND b.endDate >= :startDate")
    List<AvailabilityBlock> findConflicting(@Param("property") Property property,
                                            @Param("startDate") LocalDate startDate,
                                            @Param("endDate") LocalDate endDate);

    List<AvailabilityBlock> findByPropertyAndStartDateGreaterThanEqual(Property property, LocalDate from);

    @Query("SELECT b FROM AvailabilityBlock b WHERE b.property.appUser.id = :userId " +
           "AND b.startDate <= :to AND b.endDate >= :from ORDER BY b.startDate")
    List<AvailabilityBlock> findByUserIdAndDateRange(@Param("userId") Long userId,
                                                     @Param("from") LocalDate from,
                                                     @Param("to") LocalDate to);
}
