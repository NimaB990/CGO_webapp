package com.securetrack.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securetrack.backend.models.Container;
import com.securetrack.backend.models.IoTModule;
import com.securetrack.backend.models.Trip;
import com.securetrack.backend.repository.ContainerRepository;
import com.securetrack.backend.repository.IoTModuleRepository;
import com.securetrack.backend.repository.TripRepository;
import com.securetrack.backend.service.TripAssignmentService;

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

    @PostMapping("/assign")
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

    @GetMapping("/container/{containerId}")
    public ResponseEntity<?> getTripForContainer(@PathVariable Long containerId) {
        try {
            List<Trip> trips = tripRepository.findByContainer_ContainerIdOrderByIdDesc(containerId);
            
            if (trips.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(trips.get(0));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching trip: " + e.getMessage());
        }
    }
}