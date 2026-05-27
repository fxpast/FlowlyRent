package com.flowlyrent.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageDTO {
    private Long id;
    private Long bookingId;
    private String sender;

    @NotBlank
    private String content;

    private boolean read;
    private LocalDateTime createdAt;
}
