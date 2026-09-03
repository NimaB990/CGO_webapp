package com.securetrack.backend.dto;

import lombok.Data;

@Data
public class AssignRouteRequest {
    private Long containerId;
    private Long moduleId; // IoT Device එකේ ID එක
    private String startName;
    private String endName;
    private String startLat;
    private String startLon;
    private String endLat;
    private String endLon;
}