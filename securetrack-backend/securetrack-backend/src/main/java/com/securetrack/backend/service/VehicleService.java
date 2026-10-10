package com.securetrack.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.securetrack.backend.dto.VehicleRegisterRequest;
import com.securetrack.backend.models.Driver;
import com.securetrack.backend.repository.DriverRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final DriverRepository driverRepository;

    @Transactional
    public void registerVehicleAndDriver(VehicleRegisterRequest request) {
        if (driverRepository.existsByVehicleNo(request.getVehicleNo())) {
            throw new IllegalArgumentException("Vehicle number is already registered");
        }

        driverRepository.save(Driver.builder()
                .vehicleNo(request.getVehicleNo().toUpperCase().trim())
                .vehicleModel(request.getVehicleModel())
                .firstname(request.getDriverName())
                .lastname("")
                .phone(request.getDriverPhone())
                .nic(request.getDriverNic())
                .status("ACTIVE")
                .build());
    }
}
