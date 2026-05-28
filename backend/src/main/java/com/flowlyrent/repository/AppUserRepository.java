package com.flowlyrent.repository;

import com.flowlyrent.model.AppUser;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findByPublicSiteSlug(String slug);
    boolean existsByEmail(String email);
    boolean existsByPublicSiteSlug(String slug);
    java.util.Optional<AppUser> findByStripeCustomerId(String stripeCustomerId);

    @Query("SELECT u.id FROM AppUser u WHERE u.email IN :emails")
    List<Long> findIdsByEmailIn(@Param("emails") List<String> emails);

    @Query("SELECT COUNT(u) FROM AppUser u WHERE u.id NOT IN :excludeIds")
    long countExcluding(@Param("excludeIds") List<Long> excludeIds);

    @Query("SELECT COUNT(u) FROM AppUser u WHERE u.createdAt > :after AND u.id NOT IN :excludeIds")
    long countByCreatedAtAfterExcluding(@Param("after") LocalDateTime after, @Param("excludeIds") List<Long> excludeIds);

    @Query(value = "SELECT DATE(created_at) as day, COUNT(*) as cnt FROM users WHERE created_at > :after AND id NOT IN :excludeIds GROUP BY DATE(created_at) ORDER BY day", nativeQuery = true)
    List<Object[]> findDailyNewUsersExcluding(@Param("after") LocalDateTime after, @Param("excludeIds") List<Long> excludeIds);
}
