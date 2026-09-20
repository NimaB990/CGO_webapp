package com.securetrack.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securetrack.backend.dto.AlertResponse;
import com.securetrack.backend.dto.DriverEmergencyRequest;
import com.securetrack.backend.exception.ResourceNotFoundException;
import com.securetrack.backend.models.Alert;
import com.securetrack.backend.models.AlertSeverity;
import com.securetrack.backend.models.AlertStatus;
import com.securetrack.backend.models.AlertType;
import com.securetrack.backend.models.Trip;
import com.securetrack.backend.repository.AlertRepository;
import com.securetrack.backend.repository.TripRepository;
import com.securetrack.backend.security.UserPrincipal;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertRepository alertRepository;
    private final TripRepository tripRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER', 'CUSTOM_OFFICER', 'INSPECTOR', 'OWNER')")
        public ResponseEntity<List<AlertResponse>> getAllAlerts(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<Alert> alerts = isOwner(principal)
            ? alertRepository.findByContainer_Owner_OwnerIdOrderBySentAtDesc(principal.getId())
            : alertRepository.findAllByOrderBySentAtDesc();
        return ResponseEntity.ok(alerts.stream()
                .map(this::toResponse).toList());
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER', 'CUSTOM_OFFICER', 'INSPECTOR', 'OWNER')")
        public ResponseEntity<List<AlertResponse>> getActiveAlerts(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<Alert> alerts = isOwner(principal)
            ? alertRepository.findByStatusAndContainer_Owner_OwnerIdOrderBySentAtDesc(
                AlertStatus.PENDING, principal.getId())
            : alertRepository.findByStatusOrderBySentAtDesc(AlertStatus.PENDING);
        return ResponseEntity.ok(alerts.stream()
                .map(this::toResponse).toList());
    }

    @PostMapping("/driver-report")
    public ResponseEntity<AlertResponse> reportDriverEmergency(
            @RequestBody DriverEmergencyRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (request.getTripId() == null || request.getMessage() == null || request.getMessage().isBlank()) {
            throw new IllegalArgumentException("tripId and message are required");
        }

        Trip trip = tripRepository.findByIdAndDriverId(request.getTripId(), principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found for driver: " + request.getTripId()));
        Alert alert = Alert.builder()
                .container(trip.getContainer())
                .message(request.getMessage().trim())
                .type(AlertType.DRIVER_EMERGENCY)
                .severity(AlertSeverity.HIGH)
                .status(AlertStatus.PENDING)
                .build();
        return ResponseEntity.ok(toResponse(alertRepository.save(alert)));
    }

        @GetMapping("/container/{containerId}")
        @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER', 'CUSTOM_OFFICER', 'INSPECTOR', 'OWNER')")
    public ResponseEntity<List<AlertResponse>> getAlertsForContainer(
            @PathVariable Long containerId) {
        List<Trip> activeTrips = tripRepository.findActiveByContainerId(containerId, "COMPLETED");
        if (activeTrips.isEmpty()) {
            throw new ResourceNotFoundException("Active trip not found for container: " + containerId);
        }

        Trip activeTrip = activeTrips.get(0);
        List<Alert> alerts = activeTrip.getStartTime() == null
            ? List.of()
            : alertRepository.findByContainer_ContainerIdAndSentAtGreaterThanEqualOrderBySentAtDesc(
                containerId, activeTrip.getStartTime());
        return ResponseEntity.ok(alerts.stream()
                .map(this::toResponse).toList());
    }

    private boolean isOwner(UserPrincipal principal) {
        return principal != null && "OWNER".equals(principal.getRole());
    }

    @PutMapping("/{alertId}/acknowledge")
    public ResponseEntity<AlertResponse> acknowledgeAlert(@PathVariable Long alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));
        alert.setStatus(AlertStatus.ACKNOWLEDGED);
        return ResponseEntity.ok(toResponse(alertRepository.save(alert)));
    }

    @PutMapping("/{alertId}/resolve")
    public ResponseEntity<AlertResponse> resolveAlert(@PathVariable Long alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));
        alert.setStatus(AlertStatus.RESOLVED);
        return ResponseEntity.ok(toResponse(alertRepository.save(alert)));
    }

    private AlertResponse toResponse(Alert alert) {
        return AlertResponse.builder()
                .alertId(alert.getAlertId())
                .containerId(alert.getContainer() != null ? alert.getContainer().getContainerId() : null)
                .containerCode(alert.getContainer() != null ? alert.getContainer().getContainerCode() : null)
                .gpsLocation(alert.getGpsLocation())
                .message(alert.getMessage())
                .type(alert.getType())
                .severity(alert.getSeverity())
                .status(alert.getStatus())
                .sentAt(alert.getSentAt())
                .build();
    }
}
