package com.flowlyrent.repository;

import com.flowlyrent.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findByPublicSiteSlug(String slug);
    boolean existsByEmail(String email);
    boolean existsByPublicSiteSlug(String slug);
    java.util.Optional<AppUser> findByStripeCustomerId(String stripeCustomerId);
}
