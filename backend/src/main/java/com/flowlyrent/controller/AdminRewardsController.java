package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.service.HostRewardsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/admin/rewards")
@RequiredArgsConstructor
@Tag(name = "Récompenses")
public class AdminRewardsController {

    private final HostRewardsService rewardsService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getRewards() {
        AppUser user = securityUtils.getCurrentUser();
        return ResponseEntity.ok(rewardsService.computeRewards(user));
    }
}
