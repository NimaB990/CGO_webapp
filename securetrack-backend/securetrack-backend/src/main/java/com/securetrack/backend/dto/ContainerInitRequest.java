package com.securetrack.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContainerInitRequest {

    @NotBlank
    private String containerCode;

    @NotBlank
    private String destination;

    private String assignedRoute;

    @NotBlank
    private String deviceUid;

    private Long ownerId;
    private Long driverId;
    private Long geofenceId;
}
