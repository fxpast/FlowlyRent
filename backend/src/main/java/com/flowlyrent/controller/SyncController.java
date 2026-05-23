package com.flowlyrent.controller;

import com.flowlyrent.dto.ChannelDTO;
import com.flowlyrent.model.Channel;
import com.flowlyrent.model.Property;
import com.flowlyrent.repository.ChannelRepository;
import com.flowlyrent.repository.PropertyRepository;
import com.flowlyrent.service.ICalSyncService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/sync")
@RequiredArgsConstructor
@Tag(name = "Synchronisation iCal")
public class SyncController {

    private final ICalSyncService syncService;
    private final ChannelRepository channelRepository;
    private final PropertyRepository propertyRepository;

    @GetMapping("/channels")
    public List<Channel> getAllChannels() {
        return channelRepository.findAll();
    }

    @PostMapping("/channels")
    public ResponseEntity<Channel> createChannel(@Valid @RequestBody ChannelDTO dto) {
        Property property = propertyRepository.findById(dto.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("Logement introuvable"));

        Channel channel = new Channel();
        channel.setPlatform(dto.getPlatform());
        channel.setProperty(property);
        channel.setIcalUrl(dto.getIcalUrl());
        channel.setApiKey(dto.getApiKey());
        channel.setApiSecret(dto.getApiSecret());
        channel.setActive(true);

        return ResponseEntity.ok(channelRepository.save(channel));
    }

    @PutMapping("/channels/{id}")
    public ResponseEntity<Channel> updateChannel(@PathVariable Long id, @RequestBody ChannelDTO dto) {
        Channel channel = channelRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Canal introuvable"));

        if (dto.getIcalUrl() != null) channel.setIcalUrl(dto.getIcalUrl());
        if (dto.getApiKey() != null) channel.setApiKey(dto.getApiKey());
        if (dto.getApiSecret() != null) channel.setApiSecret(dto.getApiSecret());
        channel.setActive(dto.isActive());

        return ResponseEntity.ok(channelRepository.save(channel));
    }

    @PostMapping("/channels/{id}/sync")
    public ResponseEntity<Map<String, Object>> triggerSync(@PathVariable Long id) {
        Channel channel = channelRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Canal introuvable"));

        ICalSyncService.SyncResult result = syncService.syncChannel(channel);
        return ResponseEntity.ok(Map.of(
                "status", result.status,
                "bookingsImported", result.bookingsImported,
                "error", result.error != null ? result.error : ""
        ));
    }

    @PostMapping("/all")
    public ResponseEntity<Map<String, String>> syncAll() {
        syncService.scheduledSync();
        return ResponseEntity.ok(Map.of("status", "Synchronisation démarrée"));
    }
}
