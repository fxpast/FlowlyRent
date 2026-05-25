package com.flowlyrent.repository;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.Property;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PropertyRepository extends JpaRepository<Property, Long> {
    List<Property> findByActiveTrue();
    List<Property> findByAppUserAndActiveTrue(AppUser appUser);
    List<Property> findByAppUser(AppUser appUser);
    Optional<Property> findByAppUserAndBeds24PropId(AppUser appUser, String beds24PropId);
}
