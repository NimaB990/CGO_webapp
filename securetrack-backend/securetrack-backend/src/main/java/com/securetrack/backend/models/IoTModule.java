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

/**
 * IoTModule - the ESP32-based edge device physically attached to a Container.
 * Reports battery level, light sensor state (ambient light inside the seal)
 * and magnet/reed sensor state (seal integrity) via MQTT telemetry.
 */
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

    /** Hardware identifier broadcast by the ESP32 device (used as MQTT topic key). */
    @Column(name = "device_uid", nullable = false, unique = true, length = 64)
    private String deviceUid;

    @Column(name = "battery_level")
    private Integer batteryLevel;

    /** True if the ambient light sensor detects light (container may be open). */
    @Column(name = "light_sensor_active")
    private Boolean lightSensorActive;

    /** True if the magnetic reed switch reports the seal/door is intact & closed. */
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
