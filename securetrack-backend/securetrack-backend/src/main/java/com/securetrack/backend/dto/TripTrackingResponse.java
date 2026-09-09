package com.securetrack.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TripTrackingResponse {
    private String trackingReference;
    private Double latitude;
    private Double longitude;
    private String vehicleNumber;
    private String truckNumber;
    private String containerNumber;
    private String startLocation;
    private String endLocation;
    private String currentStatus;
    private String status;
}
