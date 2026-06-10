package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.dto.LoginResponse;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.QontoAccountRepository;
import com.flowlyrent.service.Beds24TokenService;
import com.flowlyrent.service.QontoService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
@Tag(name = "Paramètres utilisateur")
public class UserSettingsController {

    private final SecurityUtils securityUtils;
    private final AppUserRepository userRepository;
    private final Beds24AccountRepository beds24AccountRepository;
    private final Beds24TokenService beds24TokenService;
    private final PasswordEncoder passwordEncoder;
    private final QontoAccountRepository qontoAccountRepository;
    private final QontoService qontoService;

    @GetMapping("/profile")
    public ResponseEntity<LoginResponse> getProfile() {
        AppUser user = securityUtils.getCurrentUser();
        return ResponseEntity.ok(toProfileResponse(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<LoginResponse> updateProfile(@RequestBody Map<String, String> body) {
        AppUser user = securityUtils.getCurrentUser();
        if (body.containsKey("firstName"))    user.setFirstName(body.get("firstName"));
        if (body.containsKey("lastName"))     user.setLastName(body.get("lastName"));
        if (body.containsKey("phone"))        user.setPhone(body.get("phone"));
        if (body.containsKey("siret"))        user.setSiret(body.get("siret"));
        if (body.containsKey("companyName"))  user.setCompanyName(body.get("companyName"));
        if (body.containsKey("companyAddress")) user.setCompanyAddress(body.get("companyAddress"));
        if (body.containsKey("companyLogoUrl")) user.setCompanyLogoUrl(body.get("companyLogoUrl"));
        if (body.containsKey("listingsSlug"))  user.setListingsSlug(body.get("listingsSlug"));
        if (body.containsKey("beds24OwnerId")) user.setBeds24OwnerId(body.get("beds24OwnerId"));
        if (body.containsKey("publicSiteSlug")) {
            String slug = body.get("publicSiteSlug");
            if (!slug.equals(user.getPublicSiteSlug()) && userRepository.existsByPublicSiteSlug(slug)) {
                return ResponseEntity.badRequest().build();
            }
            user.setPublicSiteSlug(slug);
        }
        return ResponseEntity.ok(toProfileResponse(userRepository.save(user)));
    }

    @PatchMapping("/password")
    public ResponseEntity<Map<String, String>> changePassword(@RequestBody Map<String, String> body) {
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        if (currentPassword == null || newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mot de passe invalide (8 caractères minimum)"));
        }
        AppUser user = securityUtils.getCurrentUser();
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Mot de passe actuel incorrect"));
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("status", "Mot de passe mis à jour"));
    }

    // --- Beds24 ---

    @GetMapping("/beds24/status")
    public ResponseEntity<Map<String, Object>> beds24Status() {
        AppUser user = securityUtils.getCurrentUser();
        return beds24AccountRepository.findByAppUserId(user.getId())
                .map(a -> ResponseEntity.ok(Map.<String, Object>of(
                        "connected", a.isConnected(),
                        "lastSync", a.getLastSync() != null ? a.getLastSync().toString() : "",
                        "lastSyncStatus", a.getLastSyncStatus() != null ? a.getLastSyncStatus() : ""
                )))
                .orElse(ResponseEntity.ok(Map.of("connected", false)));
    }

    @PostMapping("/beds24/connect-token")
    public ResponseEntity<Map<String, Object>> beds24ConnectWithToken(@RequestBody Map<String, String> body) {
        AppUser user = securityUtils.getCurrentUser();
        String setupToken = body.get("setupToken");
        if (setupToken == null || setupToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Setup token manquant"));
        }

        Beds24Account account = beds24AccountRepository.findByAppUserId(user.getId())
                .orElseGet(() -> { Beds24Account a = new Beds24Account(); a.setAppUser(user); return a; });

        try {
            beds24TokenService.connectWithSetupToken(account, setupToken);
            return ResponseEntity.ok(Map.of("status", "Connecté", "connected", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/beds24/sync")
    public ResponseEntity<Map<String, Object>> beds24Sync() {
        AppUser user = securityUtils.getCurrentUser();
        Beds24Account account = beds24AccountRepository.findByAppUserId(user.getId())
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté"));

        try {
            // Architecture pass-through : plus de sync locale, le token est validé
            beds24TokenService.getValidToken(account);
            return ResponseEntity.ok(Map.of("status", "Connexion Beds24 active", "connected", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/beds24/disconnect")
    public ResponseEntity<Map<String, String>> beds24Disconnect() {
        AppUser user = securityUtils.getCurrentUser();
        beds24AccountRepository.findByAppUserId(user.getId()).ifPresent(a -> {
            a.setConnected(false);
            a.setAccessToken(null);
            a.setRefreshToken(null);
            beds24AccountRepository.save(a);
        });
        return ResponseEntity.ok(Map.of("status", "Déconnecté"));
    }

    // --- Qonto ---

    @GetMapping("/qonto/status")
    public ResponseEntity<Map<String, Object>> qontoStatus() {
        AppUser user = securityUtils.getCurrentUser();
        return qontoAccountRepository.findByAppUserId(user.getId())
                .map(a -> ResponseEntity.ok(Map.<String, Object>of(
                        "connected", a.isConnected(),
                        "lastSync", a.getLastSync() != null ? a.getLastSync().toString() : "",
                        "lastSyncStatus", a.getLastSyncStatus() != null ? a.getLastSyncStatus() : ""
                )))
                .orElse(ResponseEntity.ok(Map.of("connected", false)));
    }

    @PostMapping("/qonto/connect")
    public ResponseEntity<Map<String, Object>> qontoConnect(@RequestBody Map<String, String> body) {
        AppUser user = securityUtils.getCurrentUser();
        String login = body.get("login");
        String secretKey = body.get("secretKey");
        if (login == null || login.isBlank() || secretKey == null || secretKey.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Login et clé secrète requis"));
        }
        Map<String, Object> result = qontoService.connect(user, login, secretKey);
        if (result.containsKey("error")) return ResponseEntity.badRequest().body(result);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/qonto/disconnect")
    public ResponseEntity<Map<String, String>> qontoDisconnect() {
        AppUser user = securityUtils.getCurrentUser();
        qontoService.disconnect(user.getId());
        return ResponseEntity.ok(Map.of("status", "Déconnecté"));
    }

    private LoginResponse toProfileResponse(AppUser user) {
        LoginResponse r = new LoginResponse();
        r.setUserId(user.getId());
        r.setEmail(user.getEmail());
        r.setFirstName(user.getFirstName());
        r.setLastName(user.getLastName());
        r.setPlan(user.getPlan());
        r.setPublicSiteSlug(user.getPublicSiteSlug());
        r.setPhone(user.getPhone());
        r.setListingsSlug(user.getListingsSlug());
        r.setBeds24OwnerId(user.getBeds24OwnerId());
        r.setSiret(user.getSiret());
        r.setCompanyName(user.getCompanyName());
        r.setCompanyAddress(user.getCompanyAddress());
        r.setCompanyLogoUrl(user.getCompanyLogoUrl());
        return r;
    }
}
