package com.flowlyrent.service;

import com.flowlyrent.model.enums.Platform;

public class SyncResult {
    public Long channelId;
    public Platform platform;
    public String status;
    public int bookingsImported;
    public String error;
}
