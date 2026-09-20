package com.securetrack.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryPayload {
    private String deviceUid;
    private Double latitude;
    private Double longitude;
    private Integer batteryLevel;
    private Boolean lightSensorActive;
    private Boolean magnetSensorActive;
    private String timestamp;
}
