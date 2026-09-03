package com.securetrack.backend.controller;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.securetrack.backend.models.Alert;
import com.securetrack.backend.models.AlertSeverity;
import com.securetrack.backend.models.AlertStatus;
import com.securetrack.backend.models.AlertType;
import com.securetrack.backend.models.Container;
import com.securetrack.backend.models.Trip;
import com.securetrack.backend.repository.AlertRepository;
import com.securetrack.backend.repository.ContainerRepository;
import com.securetrack.backend.repository.TripRepository;

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

    private final Map<Long, Map<String, Object>> activeLocations = new ConcurrentHashMap<>();

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
                    .filter(t -> "IN_TRANSIT".equals(t.getStatus()) || "PLANNED".equals(t.getStatus()))
                    .findFirst()
                    .orElse(null);

            if (activeTrip != null && activeTrip.getRouteCoordinatesJson() != null) {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode routeNode = mapper.readTree(activeTrip.getRouteCoordinatesJson());
                
                double distanceFromRoute = getMinDistanceFromRoute(latitude, longitude, routeNode);
                int allowedDeviation = activeTrip.getAllowedDeviationMeters() != null ? activeTrip.getAllowedDeviationMeters() : 200;

                if (distanceFromRoute > allowedDeviation) {
                    System.out.println("🚨 ALERT: Container " + containerId + " deviated from route by " + Math.round(distanceFromRoute) + " meters!");
                    
                    // Alert Entity එකට ගැලපෙන ලෙස දත්ත සකස් කිරීම
                    Alert alert = new Alert();
                    alert.setContainer(container);
                    
                    // Enum අගයන් භාවිතය
                    alert.setType(AlertType.ROUTE_DEVIATION); 
                    alert.setSeverity(AlertSeverity.HIGH); 
                    alert.setStatus(AlertStatus.PENDING); 
                    
                    alert.setMessage("Container deviated from planned route by " + Math.round(distanceFromRoute) + " meters.");
                    alert.setGpsLocation(latitude + ", " + longitude);
                    alert.setSentAt(LocalDateTime.now());
                    
                    alertRepository.save(alert);
                    
                } else {
                    System.out.println("✅ Container " + containerId + " is on track. Distance to route: " + Math.round(distanceFromRoute) + "m");
                }
            }

            return ResponseEntity.ok().body(Map.of("message", "Live Location Updated Successfully!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Error updating location: " + e.getMessage()));
        }
    }

    @GetMapping("/live-locations")
    public ResponseEntity<List<Map<String, Object>>> getLiveLocations() {
        return ResponseEntity.ok(new ArrayList<>(activeLocations.values()));
    }

    // ඛණ්ඩාංක දෙකක් අතර දුර (Haversine Formula)
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

    // OSRM මාර්ගයට ඇති අවම දුර ගණනය කිරීම
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