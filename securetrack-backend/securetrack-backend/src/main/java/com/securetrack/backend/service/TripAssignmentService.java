package com.securetrack.backend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.securetrack.backend.models.Container;
import com.securetrack.backend.models.Geofence;
import com.securetrack.backend.models.IoTModule;
import com.securetrack.backend.models.Trip;
import com.securetrack.backend.repository.ContainerRepository;
import com.securetrack.backend.repository.GeofenceRepository;
import com.securetrack.backend.repository.TripRepository;

@Service 
public class TripAssignmentService {

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private ContainerRepository containerRepository;

    @Autowired
    private GeofenceRepository geofenceRepository;

    @Autowired
    private AuditManagementService auditService;

    @Transactional
    public Trip assignNewTrip(Container container, IoTModule iotModule, 
                              double startLat, double startLon, double endLat, double endLon, 
                              String startName, String endName, 
                              String routeCoordinatesJson, Integer allowedDeviationMeters,
                              String vehicleNumber) {
        
        // 1. Container එකට IoT Module (ESP32 ඩිවයිස්) එක සම්බන්ධ කර Database එකේ Update කිරීම
        if (iotModule != null) {
            container.setIotModule(iotModule);
            containerRepository.save(container);
        }
        
        // 2. OSRM API එකට කතා කිරීම (React පැත්තෙන් JSON එක එව්වේ නැත්නම් Backend එකෙන්ම හොයාගන්නවා)
        String finalRouteJson = routeCoordinatesJson == null ? "" : routeCoordinatesJson;
        
        if (finalRouteJson.trim().isEmpty()) {
            String osrmUrl = String.format(
                "http://router.project-osrm.org/route/v1/driving/%f,%f;%f,%f?overview=full&geometries=geojson", 
                startLon, startLat, endLon, endLat
            );
            
            try {
                RestTemplate restTemplate = new RestTemplate();
                finalRouteJson = restTemplate.getForObject(osrmUrl, String.class);
                if (finalRouteJson == null) {
                    finalRouteJson = "";
                }
                System.out.println("OSRM Route Fetched Successfully by Backend!");
            } catch (RestClientException e) {
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
                .allowedDeviationMeters(allowedDeviationMeters != null ? allowedDeviationMeters : 200)
                .status("PLANNED")
                .build();

            if (vehicleNumber == null || vehicleNumber.isBlank()) {
                throw new IllegalArgumentException("vehicleNumber is required");
            }
            newTrip.setVehicleNumber(vehicleNumber.trim().toUpperCase());

        Trip savedTrip = tripRepository.save(newTrip);

        // 4. Geofence ස්වයංක්‍රීයව සෑදීම හෝ යාවත්කාලීන කිරීම
        List<Geofence> existingGeofences = geofenceRepository.findByDestinationIgnoreCase(endName);

        String cNumber = (container != null) ? String.valueOf(container.getContainerId()) : "N/A";
        String iotMac = (iotModule != null) ? String.valueOf(iotModule.getDeviceUid()) : "N/A";

        if (existingGeofences.isEmpty()) {
            Geofence newGeofence = Geofence.builder()
                    .destination(endName)
                    .latitude(endLat)
                    .longitude(endLon)
                    .signalStrength(100)
                .startPoint(startName)
                .endPoint(endName)
                .containerNo(cNumber)
                .iotId(iotMac)
                    .build();
            geofenceRepository.save(newGeofence);

            auditService.logAction(null, "127.0.0.1",
                "Auto-created Geofence for destination: " + endName);
        } else {
            Geofence existing = existingGeofences.get(0);
            existing.setStartPoint(startName);
            existing.setEndPoint(endName);
            existing.setContainerNo(cNumber);
            existing.setIotId(iotMac);
            existing.setLatitude(endLat);
            existing.setLongitude(endLon);

            geofenceRepository.save(existing);
        }

        // 5. Route එක Assign කළ බවට System Log එකක් දැමීම
        auditService.logAction(null, "127.0.0.1",
                    "Assigned New Trip to destination: " + endName);

        return savedTrip;
    }
}