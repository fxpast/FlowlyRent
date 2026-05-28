package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.Feedback;
import com.flowlyrent.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/user/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackRepository feedbackRepository;
    private final SecurityUtils securityUtils;

    @PostMapping
    public ResponseEntity<Map<String, String>> submit(@RequestBody Map<String, String> body) {
        String category = body.get("category");
        String message = body.get("message");
        if (category == null || message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Catégorie et message obligatoires"));
        }

        AppUser user = securityUtils.getCurrentUser();
        Feedback fb = new Feedback();
        fb.setUserId(user.getId());
        fb.setUserEmail(user.getEmail());
        fb.setCategory(category);
        fb.setMessage(message.trim());
        feedbackRepository.save(fb);

        return ResponseEntity.ok(Map.of("status", "Feedback enregistré, merci !"));
    }
}
