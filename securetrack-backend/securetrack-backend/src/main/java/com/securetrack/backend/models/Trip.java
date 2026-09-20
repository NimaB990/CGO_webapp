package com.securetrack.backend.models;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trip")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_reference", nullable = false, unique = true, length = 36)
    private String trackingReference;

    @ManyToOne
    @JoinColumn(name = "container_id", nullable = false)
    private Container container;

    @Column(name = "vehicle_number", nullable = false, length = 20)
    private String vehicleNumber;

    private String startLocationName; 
    private String endLocationName;   

    private double startLat;
    private double startLon;

    private double endLat;
    private double endLon;

    @Column(columnDefinition = "LONGTEXT")
    private String routeCoordinatesJson;

    @Column(name = "allowed_deviation_meters")
    @Builder.Default
    private Integer allowedDeviationMeters = 200; 

    private String status;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @PrePersist
    protected void onCreate() {
        if (trackingReference == null || trackingReference.isBlank()) {
            trackingReference = UUID.randomUUID().toString();
        }
    }
}