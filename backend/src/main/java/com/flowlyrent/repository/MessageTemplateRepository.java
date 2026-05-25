package com.flowlyrent.repository;

import com.flowlyrent.model.MessageTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageTemplateRepository extends JpaRepository<MessageTemplate, Long> {
    List<MessageTemplate> findByUserIdAndActiveTrue(Long userId);
    List<MessageTemplate> findByUserIdAndBeds24PropertyIdAndActiveTrue(Long userId, String beds24PropertyId);
}
