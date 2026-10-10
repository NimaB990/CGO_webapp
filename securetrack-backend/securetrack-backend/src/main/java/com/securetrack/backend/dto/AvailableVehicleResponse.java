package com.securetrack.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvailableVehicleResponse {
    private Long driverId;
    private String vehicleNo;
    private String status; // "AVAILABLE"
    private String driverName;
    private String driverPhone;
}