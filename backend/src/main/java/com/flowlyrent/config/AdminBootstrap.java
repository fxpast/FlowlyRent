package com.flowlyrent.config;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.enums.SubscriptionPlan;
import com.flowlyrent.model.enums.UserRole;
import com.flowlyrent.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrap {

    private final AppUserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.username:}")
    private String adminEmail;

    @Value("${admin.password:}")
    private String adminPassword;

    @Bean
    public ApplicationRunner ensureAdminUser() {
        return args -> {
            if (adminEmail == null || adminEmail.isBlank()) return;

            userRepo.findByEmail(adminEmail).ifPresentOrElse(
                u -> {
                    if (u.getRole() != UserRole.ADMIN) {
                        u.setRole(UserRole.ADMIN);
                        userRepo.save(u);
                        log.info("Compte {} promu ADMIN", adminEmail);
                    }
                },
                () -> {
                    AppUser admin = new AppUser();
                    admin.setEmail(adminEmail);
                    admin.setPassword(passwordEncoder.encode(adminPassword));
                    admin.setRole(UserRole.ADMIN);
                    admin.setPlan(SubscriptionPlan.FREE);
                    userRepo.save(admin);
                    log.info("Compte ADMIN créé : {}", adminEmail);
                }
            );
        };
    }
}
