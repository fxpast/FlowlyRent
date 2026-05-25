package com.flowlyrent.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Beds24PropertyDTO {
    private Long id;            // ID Beds24 (ex: 132912)
    private String name;
    private String propertyType; // apartment, townhome, ...
    private String currency;
    private String address;
    private String city;
    private String state;
    private String country;
    private String postcode;
    private Double latitude;
    private Double longitude;
    private String email;
    private String checkInStart;  // "16:00"
    private String checkInEnd;    // "00:00"
    private String checkOutEnd;   // "11:00"
}
