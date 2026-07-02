package com.flowlyrent.repository;

import com.flowlyrent.model.PromoCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PromoCodeRepository extends JpaRepository<PromoCode, Long> {
    List<PromoCode> findByUserId(Long userId);
    Optional<PromoCode> findByIdAndUserId(Long id, Long userId);
    Optional<PromoCode> findByUserIdAndBeds24PropertyIdAndCodeIgnoreCaseAndActiveTrue(
            Long userId, String beds24PropertyId, String code);
}
