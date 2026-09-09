package com.securetrack.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

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

@RestController
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

    @PostMapping("/api/trips/assign")
    public ResponseEntity<?> assignTrip(@RequestBody Map<String, Object> payload) {
        try {
            Long containerId = Long.parseLong(payload.get("containerId").toString());
            Long moduleId = Long.parseLong(payload.get("moduleId").toString());
            
            double startLat = Double.parseDouble(payload.get("startLat").toString());
            double startLon = Double.parseDouble(payload.get("startLon").toString());
            double endLat = Double.parseDouble(payload.get("endLat").toString());
            double endLon = Double.parseDouble(payload.get("endLon").toString());
            String startName = payload.get("startName").toString();
            String endName = payload.get("endName").toString();
            
            // 🔴 අලුතින් එක්කළ දත්ත දෙක ලබා ගැනීම
            String routeCoordinatesJson = payload.containsKey("routeCoordinatesJson") ? payload.get("routeCoordinatesJson").toString() : null;
            Integer allowedDeviationMeters = payload.containsKey("allowedDeviationMeters") ? Integer.parseInt(payload.get("allowedDeviationMeters").toString()) : 200;

            Container container = containerRepository.findById(containerId)
                    .orElseThrow(() -> new RuntimeException("Container not found!"));

            IoTModule iotModule = iotModuleRepository.findById(moduleId)
                    .orElseThrow(() -> new RuntimeException("IoT Module not found!"));

            // 🔴 Service එකට අලුත් දත්ත දෙකත් යැවීම
            Trip newTrip = tripAssignmentService.assignNewTrip(
                container, iotModule, startLat, startLon, endLat, endLon, 
                startName, endName, routeCoordinatesJson, allowedDeviationMeters
            );

            return ResponseEntity.ok(newTrip);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error parsing request: " + e.getMessage());
        }
    }

    @GetMapping("/api/trips/container/{containerId}")
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