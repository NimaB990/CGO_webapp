package com.securetrack.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securetrack.backend.dto.TelemetryPayload;
import com.securetrack.backend.exception.BadRequestException;
import com.securetrack.backend.exception.ResourceNotFoundException;
import com.securetrack.backend.models.IoTModule;
import com.securetrack.backend.repository.IoTModuleRepository;
import com.securetrack.backend.service.MqttTelemetryService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/iot-modules")
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

    @PostMapping("/telemetry")
    public ResponseEntity<Void> ingestTelemetry(@Valid @RequestBody TelemetryPayload payload) {
        mqttTelemetryService.processTelemetry(payload);
        return ResponseEntity.accepted().build();
    }
}