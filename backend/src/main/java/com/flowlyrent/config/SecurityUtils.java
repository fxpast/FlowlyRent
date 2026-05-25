package com.flowlyrent.config;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SecurityUtils {

    private final AppUserRepository appUserRepository;

    public AppUser getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return appUserRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Utilisateur non trouvé : " + email));
    }

    public Long getCurrentUserId() {
        return getCurrentUser().getId();
    }
}
