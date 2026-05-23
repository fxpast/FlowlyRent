package com.flowlyrent.dto;

import com.flowlyrent.model.enums.Platform;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChannelDTO {
    private Long id;

    @NotNull
    private Platform platform;

    @NotNull
    private Long propertyId;

    private String icalUrl;
    private String apiKey;
    private String apiSecret;
    private boolean active;
    private LocalDateTime lastSync;
    private Integer lastSyncBookingsCount;
    private String lastSyncStatus;
}
