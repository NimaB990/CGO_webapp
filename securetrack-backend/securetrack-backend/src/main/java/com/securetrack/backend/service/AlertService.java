package com.securetrack.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.securetrack.backend.dto.AlertInvestigationRequest;
import com.securetrack.backend.exception.ResourceNotFoundException;
import com.securetrack.backend.models.Alert;
import com.securetrack.backend.models.AlertStatus;
import com.securetrack.backend.models.Driver;
import com.securetrack.backend.models.Trip;
import com.securetrack.backend.repository.AlertRepository;
import com.securetrack.backend.repository.TripRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final TripRepository tripRepository;

    @Transactional
    public Alert investigate(Long alertId, AlertInvestigationRequest request, Long investigatorId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));
        String description = request == null || request.getDescription() == null
                ? "" : request.getDescription().trim();
        if (description.isBlank()) {
            throw new IllegalArgumentException("Investigation description is required");
        }

        alert.setInvestigationDescription(description);
        alert.setInvestigatedAt(LocalDateTime.now());
        alert.setInvestigatedBy(investigatorId);
        alert.setStatus(AlertStatus.ACKNOWLEDGED);
        return alertRepository.save(alert);
    }

    @Transactional(readOnly = true)
    public List<Alert> findByVehicleNumber(String vehicleNumber) {
        if (vehicleNumber == null || vehicleNumber.isBlank()) {
            return List.of();
        }
        return alertRepository
                .findByVehicleNumberOrContainerDriverVehicleNoOrderBySentAtDesc(vehicleNumber.trim());
    }

    @Transactional(readOnly = true)
    public String resolveVehicleNumber(Alert alert) {
        if (alert == null) {
            return null;
        }
        if (alert.getVehicleNumber() != null && !alert.getVehicleNumber().isBlank()) {
            return alert.getVehicleNumber();
        }

        if (alert.getContainer() != null && alert.getContainer().getContainerId() != null) {
            Trip latestTrip = tripRepository
                    .findFirstByContainer_ContainerIdOrderByIdDesc(alert.getContainer().getContainerId())
                    .orElse(null);
            if (latestTrip != null && latestTrip.getVehicleNumber() != null
                    && !latestTrip.getVehicleNumber().isBlank()) {
                return latestTrip.getVehicleNumber();
            }

            Driver driver = alert.getContainer().getDriver();
            if (driver != null && driver.getVehicleNo() != null && !driver.getVehicleNo().isBlank()) {
                return driver.getVehicleNo();
            }
        }
        return null;
    }
}
