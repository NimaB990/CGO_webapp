package com.securetrack.backend.service;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.securetrack.backend.models.Container;
import com.securetrack.backend.models.IoTModule;
import com.securetrack.backend.models.Trip;
import com.securetrack.backend.repository.ContainerRepository;
import com.securetrack.backend.repository.TripRepository;

@Service 
public class TripAssignmentService {

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private ContainerRepository containerRepository;

    @Transactional
    public Trip assignNewTrip(Container container, IoTModule iotModule, 
                              double startLat, double startLon, double endLat, double endLon, 
                              String startName, String endName, 
                              String routeCoordinatesJson, Integer allowedDeviationMeters) { 
        
        // 1. Container එකට IoT Module (ESP32 ඩිවයිස්) එක සම්බන්ධ කර Database එකේ Update කිරීම
        if (iotModule != null) {
            container.setIotModule(iotModule);
            containerRepository.save(container);
        }
        
        // 2. OSRM API එකට කතා කිරීම (React පැත්තෙන් JSON එක එව්වේ නැත්නම් Backend එකෙන්ම හොයාගන්නවා)
        String finalRouteJson = routeCoordinatesJson;
        
        if (finalRouteJson == null || finalRouteJson.trim().isEmpty()) {
            String osrmUrl = String.format(
                "http://router.project-osrm.org/route/v1/driving/%f,%f;%f,%f?overview=full&geometries=geojson", 
                startLon, startLat, endLon, endLat
            );
            
            try {
                RestTemplate restTemplate = new RestTemplate();
                finalRouteJson = restTemplate.getForObject(osrmUrl, String.class);
                System.out.println("OSRM Route Fetched Successfully by Backend!");
            } catch (Exception e) {
                System.err.println("OSRM Error: " + e.getMessage());
            }
        }

        // 3. අලුත් Trip එක සෑදීම
        Trip newTrip = Trip.builder()
                .container(container)
                .startLat(startLat)
                .startLon(startLon)
                .endLat(endLat)
                .endLon(endLon)
                .startLocationName(startName)
                .endLocationName(endName)
                .routeCoordinatesJson(finalRouteJson)
                .allowedDeviationMeters(allowedDeviationMeters != null ? allowedDeviationMeters : 200) // 🔴 අලුත් බෆරය ඇතුලත් කිරීම
                .status("PLANNED")
                .startTime(LocalDateTime.now())
                .build();

        return tripRepository.save(newTrip);
    }
}