package com.flowlyrent.repository;

import com.flowlyrent.model.KeyBox;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KeyBoxRepository extends JpaRepository<KeyBox, Long> {
    List<KeyBox> findByUserId(Long userId);
    Optional<KeyBox> findByIdAndUserId(Long id, Long userId);
}
