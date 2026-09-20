package com.securetrack.backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "geofence")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Geofence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "geofence_id")
    private Long geofenceId;

    @Column(nullable = false, length = 150)
    private String destination;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "signal_strength")
    private Integer signalStrength;

    @Column(name = "start_point", length = 150)
    private String startPoint;

    @Column(name = "end_point", length = 150)
    private String endPoint;

    @Column(length = 50)
    private String containerNo;

    @Column(length = 50)
    private String iotId;
}
