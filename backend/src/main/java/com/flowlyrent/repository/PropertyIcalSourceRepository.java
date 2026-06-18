package com.flowlyrent.repository;

import com.flowlyrent.model.PropertyIcalSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PropertyIcalSourceRepository extends JpaRepository<PropertyIcalSource, Long> {
    List<PropertyIcalSource> findByLocalPropertyIdOrderByIdAsc(Long propertyId);
    Optional<PropertyIcalSource> findByIdAndLocalPropertyId(Long id, Long propertyId);
    void deleteByLocalPropertyId(Long propertyId);
    boolean existsByLocalPropertyId(Long propertyId);
}
