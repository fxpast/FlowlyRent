package com.flowlyrent.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Beds24RoomDTO {
    private Long id;        // Beds24 room ID
    private Long propId;    // parent property ID
    private String name;
    private String description;
    private Integer qty;        // number of identical units
    private Integer maxPeople;
    private String roomType;    // apartment, studio, room, ...
    private String bedType;     // queen, twin, double, ...
    private Boolean active;
}
