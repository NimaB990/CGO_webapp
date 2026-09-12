package com.securetrack.backend.controller;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.securetrack.backend.dto.LocationUpdateRequest;
import com.securetrack.backend.exception.ResourceNotFoundException;
import com.securetrack.backend.models.Alert;
import com.securetrack.backend.models.AlertSeverity;
import com.securetrack.backend.models.AlertStatus;
import com.securetrack.backend.models.AlertType;
import com.securetrack.backend.models.Container;
import com.securetrack.backend.models.Trip;
import com.securetrack.backend.models.TripLocation;
import com.securetrack.backend.repository.AlertRepository;
import com.securetrack.backend.repository.ContainerRepository;
import com.securetrack.backend.repository.TripLocationRepository;
import com.securetrack.backend.repository.TripRepository;
import com.securetrack.backend.service.AlertNotificationService;
import com.securetrack.backend.service.TripService;

@RestController
@RequestMapping("/api/monitoring")
@CrossOrigin(origins = "http://localhost:3000")
public class MonitoringController {

    @Autowired
    private ContainerRepository containerRepository;
    
    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private TripLocationRepository tripLocationRepository;

    @Autowired
    private TripService tripService;

    @Autowired
    private AlertNotificationService alertNotificationService; // Added here

    private final Map<Long, Map<String, Object>> activeLocations = new ConcurrentHashMap<>();

    @PostMapping("/location")
    public ResponseEntity<TripLocation> saveLocation(@RequestBody LocationUpdateRequest request) {
        if (request.getTripId() == null || request.getLatitude() == null
                || request.getLongitude() == null) {
            throw new IllegalArgumentException("tripId, latitude, and longitude are required");
        }

        Trip trip = tripRepository.findByIdWithContainer(request.getTripId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Trip not found: " + request.getTripId()));
        if (request.getContainerId() != null
                && (trip.getContainer() == null
                || !request.getContainerId().equals(trip.getContainer().getContainerId()))) {
            throw new IllegalArgumentException("containerId does not belong to trip");
        }

        TripLocation location = TripLocation.builder()
                .trip(trip)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .timestamp(request.getTimestamp())
                .build();
        return ResponseEntity.ok(tripLocationRepository.save(location));
    }

    @GetMapping("/trip/{tripId}/locations")
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER', 'OWNER', 'CUSTOM_OFFICER', 'INSPECTOR')")
    public ResponseEntity<List<TripLocation>> getTripLocations(@PathVariable Long tripId) {
        if (!tripRepository.existsById(tripId)) {
            throw new ResourceNotFoundException("Trip not found: " + tripId);
        }
        return ResponseEntity.ok(tripLocationRepository.findByTrip_IdOrderByTimestampAsc(tripId));
    }

    @GetMapping("/vehicle/{vehicleNumber}/locations")
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER', 'OWNER', 'CUSTOM_OFFICER', 'INSPECTOR')")
    public ResponseEntity<List<TripLocation>> getVehicleLocations(
            @PathVariable String vehicleNumber) {
        Trip trip = tripService.findActiveByVehicleNumber(vehicleNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active or planned trip found for vehicle: " + vehicleNumber));
        return ResponseEntity.ok(
                tripLocationRepository.findByTrip_IdOrderByTimestampAsc(trip.getId()));
    }

    @PostMapping("/update")
    public ResponseEntity<?> updateLocation(@RequestBody Map<String, Object> payload) {
        try {
            Long containerId = Long.parseLong(payload.get("containerId").toString());
            double latitude = Double.parseDouble(payload.get("latitude").toString());
            double longitude = Double.parseDouble(payload.get("longitude").toString());
            double speed = payload.containsKey("speed") ? Double.parseDouble(payload.get("speed").toString()) : 0.0;

            Container container = containerRepository.findByIdWithIotModule(containerId)
                    .orElseThrow(() -> new RuntimeException("Container not found!"));

            String deviceUid = (container.getIotModule() != null) ? container.getIotModule().getDeviceUid() : "UNKNOWN-DEVICE";
            String status = (container.getStatus() != null) ? container.getStatus().toString() : "ACTIVE";

            Map<String, Object> liveData = new HashMap<>();
            liveData.put("containerId", container.getContainerId());
            liveData.put("latitude", latitude);
            liveData.put("longitude", longitude);
            liveData.put("status", status);
            liveData.put("speed", speed);
            liveData.put("deviceId", deviceUid);

            activeLocations.put(containerId, liveData);

            // ---------- ROUTE DEVIATION LOGIC ----------
            List<Trip> trips = tripRepository.findByContainer_ContainerIdOrderByIdDesc(containerId);
            Trip activeTrip = trips.stream()
                    .filter(t -> "ACTIVE".equals(t.getStatus()) || "IN_TRANSIT".equals(t.getStatus())
                        || "PLANNED".equals(t.getStatus()))
                    .findFirst()
                    .orElse(null);

                    if (activeTrip == null) {
                    throw new ResourceNotFoundException(
                        "No active or planned trip found for container: " + containerId);
                    }

            LocalDateTime timestamp = parseTimestamp(payload.get("timestamp"));
            TripLocation location = TripLocation.builder()
                    .trip(activeTrip)
                    .latitude(latitude)
                    .longitude(longitude)
                    .timestamp(timestamp)
                    .build();
            TripLocation savedLocation = tripLocationRepository.save(location);

            if (activeTrip.getRouteCoordinatesJson() != null
                    && !activeTrip.getRouteCoordinatesJson().isBlank()) {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode routeNode = mapper.readTree(activeTrip.getRouteCoordinatesJson());
                
                double distanceFromRoute = getMinDistanceFromRoute(latitude, longitude, routeNode);
                Integer configuredDeviation = activeTrip.getAllowedDeviationMeters();
                int allowedDeviation = configuredDeviation != null ? configuredDeviation : 200;

                if (distanceFromRoute > allowedDeviation) {
                    System.out.println("🚨 ALERT: Container " + containerId + " deviated from route by " + Math.round(distanceFromRoute) + " meters!");
                    
                    // Alert Entity එකට ගැලපෙන ලෙස දත්ත සකස් කිරීම
                    Alert alert = new Alert();
                    alert.setContainer(container);
                    
                    alert.setType(AlertType.ROUTE_DEVIATION); 
                    alert.setSeverity(AlertSeverity.HIGH); 
                    alert.setStatus(AlertStatus.PENDING); 
                    
                    alert.setMessage("Container deviated from planned route by " + Math.round(distanceFromRoute) + " meters.");
                    alert.setGpsLocation(latitude + ", " + longitude);
                    alert.setSentAt(LocalDateTime.now());
                    
                    Alert savedAlert = alertRepository.save(alert);
                    
                    // Trigger Email / Notifications
                    alertNotificationService.notify(savedAlert); // Added here
                    
                } else {
                    System.out.println("✅ Container " + containerId + " is on track. Distance to route: " + Math.round(distanceFromRoute) + "m");
                }
            }

            return ResponseEntity.ok(savedLocation);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Error updating location: " + e.getMessage()));
        }
    }

    @GetMapping("/live-locations")
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER', 'OWNER', 'CUSTOM_OFFICER', 'INSPECTOR')")
    public ResponseEntity<List<Map<String, Object>>> getLiveLocations() {
        return ResponseEntity.ok(new ArrayList<>(activeLocations.values()));
    }

    private LocalDateTime parseTimestamp(Object rawTimestamp) {
        if (rawTimestamp == null) {
            return LocalDateTime.now();
        }
        String value = rawTimestamp.toString();
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ex) {
            return OffsetDateTime.parse(value).toLocalDateTime();
        }
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; 
    }

    private double getMinDistanceFromRoute(double currentLat, double currentLon, JsonNode osrmRouteNode) {
        double minDistance = Double.MAX_VALUE;
        try {
            JsonNode coordinates = osrmRouteNode.path("routes").get(0).path("geometry").path("coordinates");
            for (JsonNode coord : coordinates) {
                double routeLon = coord.get(0).asDouble();
                double routeLat = coord.get(1).asDouble();
                double distance = calculateDistance(currentLat, currentLon, routeLat, routeLon);
                if (distance < minDistance) {
                    minDistance = distance;
                }
            }
        } catch (Exception e) {
            System.err.println("Error parsing route geometry: " + e.getMessage());
        }
        return minDistance;
    }
}