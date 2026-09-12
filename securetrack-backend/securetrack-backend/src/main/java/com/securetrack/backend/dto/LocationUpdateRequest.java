package com.securetrack.backend.dto;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class LocationUpdateRequest {
    private Long tripId;
    private Long containerId;
    private Double latitude;
    private Double longitude;
    private LocalDateTime timestamp;
}