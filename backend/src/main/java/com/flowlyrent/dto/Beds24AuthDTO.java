package com.flowlyrent.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Beds24AuthDTO {
    private boolean success;
    private String token;
    private String refreshToken;
    private Integer expiresIn;
    private String error;
    private Integer code;
}
