package com.securetrack.backend.dto;

import lombok.Data;

@Data
public class DriverEmergencyRequest {
    private Long tripId;
    private String message;
}