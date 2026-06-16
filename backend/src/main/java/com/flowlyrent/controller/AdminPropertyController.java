package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.model.enums.ChannelType;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.repository.LocalPropertyRepository;
import com.flowlyrent.service.Beds24ApiClient;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/properties")
@RequiredArgsConstructor
@Tag(name = "Propriétés admin")
public class AdminPropertyController {

    private final Beds24ApiClient beds24;
    private final Beds24AccountRepository accountRepo;
    private final LocalPropertyRepository localPropertyRepo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<?> getProperties(@RequestParam Map<String, String> params) {
        try {
            AppUser user = securityUtils.getCurrentUser();
            if (user.getChannelType() == ChannelType.ICAL) {
                List<Map<String, Object>> props = localPropertyRepo
                        .findByUserIdOrderByCreatedAtAsc(user.getId())
                        .stream()
                        .map(p -> {
                            java.util.Map<String, Object> m = new java.util.HashMap<>();
                            m.put("id", p.getId().toString());
                            m.put("name", p.getName());
                            m.put("shortName", p.getShortName() != null ? p.getShortName() : "");
                            m.put("icalUrl", p.getIcalUrl() != null ? p.getIcalUrl() : "");
                            return m;
                        })
                        .toList();
                return ResponseEntity.ok(props);
            }
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.getProperties(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{propertyId}/offers")
    public ResponseEntity<?> getOffers(@PathVariable String propertyId, @RequestParam Map<String, String> params) {
        try {
            params.put("propertyId", propertyId);
            Beds24Account account = requireAccount();
            return ResponseEntity.ok(beds24.getOffers(beds24.tokenFor(account), params));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Beds24Account requireAccount() {
        return accountRepo.findByAppUserId(securityUtils.getCurrentUserId())
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté."));
    }
}
