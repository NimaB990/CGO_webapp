package com.securetrack.backend.service;

import com.securetrack.backend.dto.TelemetryPayload;
import com.securetrack.backend.models.*;
import com.securetrack.backend.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RouteVerificationService {

    private static final Logger log = LoggerFactory.getLogger(RouteVerificationService.class);

    private final AlertRepository alertRepository;
    private final AlertNotificationService alertNotificationService;

    @Value("${securetrack.geofence.deviation-threshold:0.01}")
    private double deviationThreshold;

    public void verifyRoute(Container container, TelemetryPayload payload) {
        Geofence geofence = container.getGeofence();
        if (geofence == null || payload.getLatitude() == null || payload.getLongitude() == null) {
            return; 
        }

        double distance = haversineDistanceKm(
                geofence.getLatitude(), geofence.getLongitude(),
                payload.getLatitude(), payload.getLongitude());

        double toleranceKm = deviationThreshold * 111.0;

        if (distance > toleranceKm) {
            String gps = payload.getLatitude() + "," + payload.getLongitude();
            Alert alert = Alert.builder()
                    .container(container)
                    .gpsLocation(gps)
                    .type(AlertType.ROUTE_DEVIATION)
                    .severity(AlertSeverity.HIGH)
                    .message(String.format(
                            "Container %s has deviated %.2f km from its assigned geofence corridor toward %s",
                            container.getContainerCode(), distance, geofence.getDestination()))
                    .status(AlertStatus.PENDING)
                    .build();

            Alert saved = alertRepository.save(alert);
            log.warn("Route deviation detected for container {}: {} km off corridor",
                    container.getContainerCode(), distance);
            alertNotificationService.notify(saved);
        }
    }

    private double haversineDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        final int earthRadiusKm = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }
}
