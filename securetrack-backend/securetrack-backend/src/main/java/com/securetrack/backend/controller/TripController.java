package com.securetrack.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securetrack.backend.dto.TripAssignmentRequest;
import com.securetrack.backend.dto.TripTrackingResponse;
import com.securetrack.backend.exception.ResourceNotFoundException;
import com.securetrack.backend.models.Container;
import com.securetrack.backend.models.IoTModule;
import com.securetrack.backend.models.Trip;
import com.securetrack.backend.repository.ContainerRepository;
import com.securetrack.backend.repository.IoTModuleRepository;
import com.securetrack.backend.repository.TripRepository;
import com.securetrack.backend.security.UserPrincipal;
import com.securetrack.backend.service.TripAssignmentService;
import com.securetrack.backend.service.TripService;

@RestController
@RequestMapping("/api/trips")
@CrossOrigin(origins = "http://localhost:3000")
public class TripController {

    @Autowired
    private TripAssignmentService tripAssignmentService;

    @Autowired
    private ContainerRepository containerRepository; 

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private IoTModuleRepository iotModuleRepository;

    @Autowired
    private TripService tripService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER', 'OWNER', 'CUSTOM_OFFICER', 'INSPECTOR')")
    public ResponseEntity<List<Trip>> getAllTrips() {
        return ResponseEntity.ok(tripRepository.findAll());
    }

    @PostMapping("/assign")
    public ResponseEntity<?> assignTrip(@RequestBody TripAssignmentRequest payload) {
        try {
            if (payload.getVehicleNumber() == null || payload.getVehicleNumber().isBlank()) {
                throw new IllegalArgumentException("vehicleNumber is required");
            }

            Container container = containerRepository.findById(payload.getContainerId())
                    .orElseThrow(() -> new RuntimeException("Container not found!"));

            IoTModule iotModule = iotModuleRepository.findById(payload.getModuleId())
                    .orElseThrow(() -> new RuntimeException("IoT Module not found!"));

            Trip newTrip = tripAssignmentService.assignNewTrip(
                container, iotModule, payload.getStartLat(), payload.getStartLon(),
                payload.getEndLat(), payload.getEndLon(), payload.getStartName(),
                payload.getEndName(), payload.getRouteCoordinatesJson(),
                payload.getAllowedDeviationMeters(), payload.getVehicleNumber().trim()
            );

            return ResponseEntity.ok(newTrip);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error parsing request: " + e.getMessage());
        }
    }

    @GetMapping("/driver/active")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<Trip> getActiveDriverTrip(@AuthenticationPrincipal UserPrincipal principal) {
        List<Trip> trips = tripRepository.findAssignedByDriverAndStatusIn(
                principal.getId(), List.of("PLANNED", "ACTIVE"));
        if (trips.isEmpty()) {
            throw new ResourceNotFoundException("No active trip assigned to the driver");
        }
        return ResponseEntity.ok(trips.get(0));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER', 'OWNER', 'CUSTOM_OFFICER', 'INSPECTOR')")
    public ResponseEntity<List<Trip>> getActiveTrips() {
        return ResponseEntity.ok(tripRepository.findByStatusInOrderByIdDesc(
                List.of("PLANNED", "ACTIVE")));
    }

    @GetMapping("/debug/vehicles")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOM_OFFICER')")
    public ResponseEntity<List<String>> getSavedVehicleNumbers() {
        return ResponseEntity.ok(tripService.findSavedVehicleNumbers());
    }

    @GetMapping("/vehicle/{vehicleNumber}/active")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN', 'OWNER', 'CUSTOM_OFFICER')")
    public ResponseEntity<Trip> getActiveVehicleTrip(@PathVariable String vehicleNumber,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        Trip trip = tripService.findActiveByVehicleNumber(vehicleNumber)
            .orElseThrow(() -> new ResourceNotFoundException(
                "No active trip found for the assigned vehicle"));
        return ResponseEntity.ok(trip);
    }

    @PutMapping("/{tripId}/status")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<Trip> updateTripStatus(@PathVariable Long tripId,
                                                  @RequestBody Map<String, String> payload,
                                                  @AuthenticationPrincipal UserPrincipal principal) {
        String requestedStatus = payload == null ? null : payload.get("status");
        return ResponseEntity.ok(tripService.updateStatus(
                tripId, principal.getId(), requestedStatus));
    }

    @GetMapping("/container/{containerId}")
    public ResponseEntity<?> getTripForContainer(@PathVariable Long containerId,
                                                  @AuthenticationPrincipal UserPrincipal principal) {
        try {
            List<Trip> trips;
            if (principal != null && "OWNER".equals(principal.getRole())) {
            trips = tripRepository.findByContainer_ContainerIdAndContainer_Owner_OwnerIdOrderByIdDesc(
                containerId, principal.getId());
            } else {
            trips = tripRepository.findByContainer_ContainerIdOrderByIdDesc(containerId);
            }
            
            if (trips.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(trips.get(0));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching trip: " + e.getMessage());
        }
    }

        @GetMapping("/api/dashboard/track/{containerId}")
    public ResponseEntity<TripTrackingResponse> trackTrip(@PathVariable Long containerId) {
        List<Trip> activeTrips = tripRepository.findActiveByContainerId(containerId, "COMPLETED");
        if (activeTrips.isEmpty()) {
            throw new ResourceNotFoundException("Active trip not found for container: " + containerId);
        }

        Trip trip = activeTrips.get(0);
        Container container = trip.getContainer();
        IoTModule iotModule = container.getIotModule();
        String currentStatus = container.getStatus() != null ? container.getStatus().name() : trip.getStatus();
        return ResponseEntity.ok(TripTrackingResponse.builder()
                .trackingReference(trip.getTrackingReference())
                .latitude(iotModule != null ? iotModule.getLatitude() : null)
                .longitude(iotModule != null ? iotModule.getLongitude() : null)
                .vehicleNumber(container.getDriver() != null ? container.getDriver().getVehicleNo() : null)
            .truckNumber(container.getDriver() != null ? container.getDriver().getVehicleNo() : null)
                .containerNumber(container.getContainerCode())
                .startLocation(trip.getStartLocationName())
                .endLocation(trip.getEndLocationName())
            .currentStatus(currentStatus)
            .status(currentStatus)
                .build());
    }
}