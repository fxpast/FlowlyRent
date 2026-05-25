package com.flowlyrent.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class Beds24ConnectDTO {
    @NotBlank
    private String username;

    @NotBlank
    private String password;
}
