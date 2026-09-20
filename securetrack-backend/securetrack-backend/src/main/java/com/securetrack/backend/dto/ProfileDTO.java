package com.securetrack.backend.dto;

import lombok.Data;

@Data
public class ProfileDTO {

    private String firstName;
    private String lastName;
    private String email;
    private String phone;

    private boolean emailAlerts;
    private boolean smsAlerts;
    private boolean systemAlerts;

    private boolean twoFactorAuth;

    private String language;
    private String timezone;

    @Data
    public static class PasswordChangeRequest {
        private String currentPassword;
        private String newPassword;
    }
}