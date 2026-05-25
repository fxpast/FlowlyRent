package com.flowlyrent.repository;

import com.flowlyrent.model.Property;
import com.flowlyrent.model.PropertyRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PropertyRoomRepository extends JpaRepository<PropertyRoom, Long> {
    List<PropertyRoom> findByPropertyAndActiveTrue(Property property);
    List<PropertyRoom> findByProperty(Property property);
    Optional<PropertyRoom> findByPropertyAndBeds24RoomId(Property property, String beds24RoomId);
}
