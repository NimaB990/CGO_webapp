package com.securetrack.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securetrack.backend.dto.AvailableVehicleResponse;
import com.securetrack.backend.models.Driver;
import com.securetrack.backend.repository.DriverRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final DriverRepository driverRepository;

    @GetMapping("/available")
    public ResponseEntity<List<AvailableVehicleResponse>> getAvailableVehicles() {
        List<Driver> drivers = driverRepository.findAvailableDrivers();

        List<AvailableVehicleResponse> response = drivers.stream()
                .map(d -> AvailableVehicleResponse.builder()
                        .driverId(d.getDriverId())
                        .vehicleNo(d.getVehicleNo())
                        .status("AVAILABLE")
                        .build())
                .toList();

        return ResponseEntity.ok(response);
    }
}