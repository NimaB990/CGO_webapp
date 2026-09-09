package com.securetrack.backend.controller;

import com.securetrack.backend.dto.TelemetryPayload;
import com.securetrack.backend.exception.BadRequestException;
import com.securetrack.backend.exception.ResourceNotFoundException;
import com.securetrack.backend.models.IoTModule;
import com.securetrack.backend.repository.IoTModuleRepository;
import com.securetrack.backend.service.MqttTelemetryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.List;

/**
 * IoTModuleController - registers ESP32 edge devices (so they can be linked
 * to a Container during "Initialize Container Tracking") and exposes their
 * latest reported status.
 *
 * Also exposes a REST fallback ingestion endpoint (/api/iot-modules/telemetry)
 * that feeds the same processing pipeline as MqttTelemetryService, useful for
 * bench-testing devices/postman without a live MQTT broker.
 */
//@RestController
//@RequestMapping("/api/iot-modules")
@RequiredArgsConstructor
public class IoTModuleController {

    private final IoTModuleRepository ioTModuleRepository;
    private final MqttTelemetryService mqttTelemetryService;

    @GetMapping
    public ResponseEntity<List<IoTModule>> getAll() {
        return ResponseEntity.ok(ioTModuleRepository.findAll());
    }

    @GetMapping("/{deviceUid}")
    public ResponseEntity<IoTModule> getByDeviceUid(@PathVariable String deviceUid) {
        return ResponseEntity.ok(ioTModuleRepository.findByDeviceUid(deviceUid)
                .orElseThrow(() -> new ResourceNotFoundException("IoT module not found: " + deviceUid)));
    }

    @PostMapping("/register")
    public ResponseEntity<IoTModule> register(@RequestBody IoTModule module) {
        if (module.getDeviceUid() == null || module.getDeviceUid().isBlank()) {
            throw new BadRequestException("deviceUid is required to register an IoT module");
        }
        if (ioTModuleRepository.findByDeviceUid(module.getDeviceUid()).isPresent()) {
            throw new BadRequestException("Device UID already registered: " + module.getDeviceUid());
        }
        module.setModuleId(null);
        return ResponseEntity.status(201).body(ioTModuleRepository.save(module));
    }

    /** REST fallback for injecting a telemetry reading without a live MQTT broker (testing/demo). */
    @PostMapping("/telemetry")
    public ResponseEntity<Void> ingestTelemetry(@Valid @RequestBody TelemetryPayload payload) {
        mqttTelemetryService.processTelemetry(payload);
        return ResponseEntity.accepted().build();
    }
}
