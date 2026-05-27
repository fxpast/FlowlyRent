package com.flowlyrent.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

/**
 * Service d'envoi d'emails transactionnels (abonnements, notifications système).
 * Les emails liés aux réservations sont gérés directement par Beds24.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    @Value("${app.name:FlowlyRent}")
    private String appName;

    public void send(String to, String subject, String htmlBody) {
        if (!isConfigured()) return;
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
            log.info("Email envoyé à {} : {}", to, subject);
        } catch (Exception e) {
            log.warn("Impossible d'envoyer l'email à {} : {}", to, e.getMessage());
        }
    }

    public boolean isConfigured() {
        return fromAddress != null && !fromAddress.isBlank();
    }
}
