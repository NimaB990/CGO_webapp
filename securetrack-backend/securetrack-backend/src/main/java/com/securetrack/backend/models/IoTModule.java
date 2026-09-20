package com.securetrack.backend.models;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "iot_module")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IoTModule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "module_id")
    private Long moduleId;

    @Column(name = "device_uid", nullable = false, unique = true, length = 64)
    private String deviceUid;

    @Column(name = "battery_level")
    private Integer batteryLevel;

    @Column(name = "light_sensor_active")
    private Boolean lightSensorActive;

    @Column(name = "magnet_sensor_active")
    private Boolean magnetSensorActive;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @JsonIgnore
    @OneToOne(mappedBy = "iotModule")
    private Container container;
}
