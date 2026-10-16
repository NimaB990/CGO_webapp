package com.securetrack.backend.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripEtaResponse {
    private String containerNumber;
    private String destination;
    private Double remainingDistanceKm;
    private Integer estimatedMinutesRemaining;
    private LocalDateTime estimatedArrival;
    private Double currentSpeedKmPerHour;
}
