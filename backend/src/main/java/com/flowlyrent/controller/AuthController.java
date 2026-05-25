package com.flowlyrent.controller;

import com.flowlyrent.config.JwtTokenProvider;
import com.flowlyrent.dto.LoginRequest;
import com.flowlyrent.dto.LoginResponse;
import com.flowlyrent.dto.RegisterRequest;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.enums.SubscriptionPlan;
import com.flowlyrent.repository.AppUserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification")
public class AuthController {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email déjà utilisé"));
        }

        AppUser user = new AppUser();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPlan(SubscriptionPlan.FREE);
        user.setPublicSiteSlug(generateSlug(request.getEmail()));
        user = userRepository.save(user);

        return ResponseEntity.ok(buildLoginResponse(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        AppUser user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));

        return ResponseEntity.ok(buildLoginResponse(user));
    }

    private LoginResponse buildLoginResponse(AppUser user) {
        LoginResponse resp = new LoginResponse();
        resp.setToken(jwtTokenProvider.generateToken(user));
        resp.setUserId(user.getId());
        resp.setEmail(user.getEmail());
        resp.setFirstName(user.getFirstName());
        resp.setLastName(user.getLastName());
        resp.setPlan(user.getPlan());
        resp.setPublicSiteSlug(user.getPublicSiteSlug());
        return resp;
    }

    private String generateSlug(String email) {
        String base = email.split("@")[0]
                .toLowerCase()
                .replaceAll("[^a-z0-9]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        // S'assure de l'unicité
        String slug = base;
        int suffix = 2;
        while (userRepository.existsByPublicSiteSlug(slug)) {
            slug = base + "-" + suffix++;
        }
        return slug;
    }
}
