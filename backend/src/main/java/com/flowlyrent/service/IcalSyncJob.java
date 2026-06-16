package com.flowlyrent.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class IcalSyncJob {

    private final IcalSyncService icalSyncService;

    @Scheduled(cron = "${sync.ical.cron}")
    public void run() {
        log.info("[iCal] Démarrage sync automatique");
        icalSyncService.syncAllUsers();
    }
}
