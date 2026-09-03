package com.securetrack.backend.dto;

import lombok.Data;

@Data
public class LocationUpdateRequest {
    private Long containerId;
    private Double latitude;
    private Double longitude;
    private Double speed;
    private Integer batteryLevel;
}