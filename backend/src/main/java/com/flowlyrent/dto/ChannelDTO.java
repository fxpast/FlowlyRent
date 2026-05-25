package com.flowlyrent.dto;

import com.flowlyrent.model.enums.Platform;
import com.flowlyrent.model.enums.SyncType;
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

    private SyncType syncType = SyncType.ICAL;
    private String externalPropertyId; // ID propriété dans Beds24

    private String icalUrl;
    private String apiKey;
    private String apiSecret;
    private boolean active;
    private LocalDateTime lastSync;
    private Integer lastSyncBookingsCount;
    private String lastSyncStatus;
}
