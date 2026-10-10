package com.securetrack.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securetrack.backend.dto.ApiResponse;
import com.securetrack.backend.dto.AvailableVehicleResponse;
import com.securetrack.backend.dto.VehicleRegisterRequest;
import com.securetrack.backend.models.Driver;
import com.securetrack.backend.repository.DriverRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final DriverRepository driverRepository;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse> registerVehicle(@RequestBody VehicleRegisterRequest request) {
        Driver driver = Driver.builder()
                .vehicleNo(request.getVehicleNo())
                .vehicleModel(request.getVehicleModel())
                .firstname(request.getDriverName())
                .lastname("")
                .phone(request.getDriverPhone())
                .nic(request.getDriverNic())
                .status("ACTIVE")
                .username(request.getDriverNic())
                .email(request.getDriverNic() + "@registered.securetrack")
                .password("")
                .active(true)
                .build();

        driverRepository.save(driver);
        return ResponseEntity.ok(ApiResponse.ok("Vehicle registered successfully"));
    }

    @GetMapping("/available")
    public ResponseEntity<List<AvailableVehicleResponse>> getAvailableVehicles() {
        List<Driver> drivers = driverRepository.findAvailableDrivers();

        List<AvailableVehicleResponse> response = drivers.stream()
                .map(d -> AvailableVehicleResponse.builder()
                        .driverId(d.getDriverId())
                        .vehicleNo(d.getVehicleNo())
                        .status("AVAILABLE")
                        .driverName(d.getFirstname())
                        .driverPhone(d.getPhone())
                        .build())
                .toList();

        return ResponseEntity.ok(response);
    }
}