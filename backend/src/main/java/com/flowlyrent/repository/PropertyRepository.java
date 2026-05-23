package com.flowlyrent.repository;

import com.flowlyrent.model.Property;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {
    List<Property> findByActiveTrue();
}
