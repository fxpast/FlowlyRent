package com.flowlyrent.dto;

import com.flowlyrent.model.enums.SubscriptionPlan;
import com.flowlyrent.model.enums.UserRole;
import lombok.Data;

@Data
public class LoginResponse {
    private String token;
    private Long userId;
    private String email;
    private String firstName;
    private String lastName;
    private SubscriptionPlan plan;
    private String publicSiteSlug;
    private UserRole role;
}
