package com.flowlyrent.repository;

import com.flowlyrent.model.ChatbotActionFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatbotActionFeedbackRepository extends JpaRepository<ChatbotActionFeedback, Long> {
    List<ChatbotActionFeedback> findAllByOrderByCreatedAtDesc();
    void deleteByUserId(Long userId);
}
