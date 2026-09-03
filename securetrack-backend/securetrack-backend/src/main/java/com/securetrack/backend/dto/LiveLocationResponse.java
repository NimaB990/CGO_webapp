package com.securetrack.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LiveLocationResponse {
    private Long containerId;
    private Double latitude;
    private Double longitude;
    private String status;
    private Double speed;
    private String deviceId;
}