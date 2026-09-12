package com.securetrack.backend.dto;

import lombok.Data;

@Data
public class TripAssignmentRequest {
    private Long containerId;
    private Long moduleId;
    private double startLat;
    private double startLon;
    private double endLat;
    private double endLon;
    private String startName;
    private String endName;
    private String routeCoordinatesJson;
    private Integer allowedDeviationMeters;
    private String vehicleNumber;
}