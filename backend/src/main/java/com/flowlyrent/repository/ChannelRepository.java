package com.flowlyrent.repository;

import com.flowlyrent.model.Channel;
import com.flowlyrent.model.enums.Platform;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChannelRepository extends JpaRepository<Channel, Long> {
    List<Channel> findByActiveTrue();
    List<Channel> findByPropertyIdAndPlatform(Long propertyId, Platform platform);
}
