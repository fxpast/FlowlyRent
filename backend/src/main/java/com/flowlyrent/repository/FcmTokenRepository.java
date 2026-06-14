package com.flowlyrent.repository;

import com.flowlyrent.model.FcmToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FcmTokenRepository extends JpaRepository<FcmToken, Long> {
    List<FcmToken> findByUserId(Long userId);
    Optional<FcmToken> findByUserIdAndToken(Long userId, String token);
    void deleteByToken(String token);
}
