package com.securetrack.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.securetrack.backend.dto.TripEtaResponse;
import com.securetrack.backend.exception.ResourceNotFoundException;
import com.securetrack.backend.models.Trip;
import com.securetrack.backend.models.TripLocation;
import com.securetrack.backend.repository.TripRepository;
import com.securetrack.backend.repository.TripLocationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final TripLocationRepository tripLocationRepository;

    private static final double DEFAULT_SPEED_KM_PER_HOUR = 35.0;
    private static final List<String> ETA_ACTIVE_STATUSES =
            List.of("PLANNED", "ACTIVE", "IN_TRANSIT", "STARTED", "PENDING", "ASSIGNED");

    public Optional<Trip> findActiveByVehicleNumber(String vehicleNumber) {
        if (vehicleNumber == null || vehicleNumber.isBlank()) {
            return Optional.empty();
        }
        return tripRepository.findFirstByVehicleNumberIgnoreCaseAndStatusInOrderByStartTimeDescIdDesc(
                vehicleNumber.trim(), List.of("PLANNED", "ACTIVE"));
    }

    public List<String> findSavedVehicleNumbers() {
        return tripRepository.findDistinctVehicleNumberByVehicleNumberIsNotNull();
    }

    @Transactional(readOnly = true)
    public Optional<Trip> findLatestByContainerIdentifier(String identifier, Long ownerId) {
        if (identifier == null || identifier.isBlank()) {
            return Optional.empty();
        }

        String normalizedIdentifier = identifier.trim();
        try {
            Long containerId = Long.valueOf(normalizedIdentifier);
            Optional<Trip> trip = ownerId == null
                    ? tripRepository.findFirstByContainer_ContainerIdOrderByIdDesc(containerId)
                    : tripRepository
                            .findFirstByContainer_ContainerIdAndContainer_Owner_OwnerIdOrderByIdDesc(
                                    containerId, ownerId);
            if (trip.isPresent()) {
                return trip;
            }
        } catch (NumberFormatException ignored) {
            // The identifier may be a container code rather than a database ID.
        }

        return ownerId == null
                ? tripRepository.findFirstByContainer_ContainerCodeOrderByIdDesc(normalizedIdentifier)
                : tripRepository
                        .findFirstByContainer_ContainerCodeAndContainer_Owner_OwnerIdOrderByIdDesc(
                                normalizedIdentifier, ownerId);
    }

    @Transactional(readOnly = true)
    public TripEtaResponse getTripEta(String identifier) {
        String normalizedIdentifier = identifier == null ? "" : identifier.trim();
        return calculateEta(normalizedIdentifier);
    }

    @Transactional(readOnly = true)
    public TripEtaResponse getEtaByVehicleNo(String vehicleNo) {
        return getTripEta(vehicleNo);
    }

    @Transactional(readOnly = true)
    public TripEtaResponse calculateEta(String containerNumber) {
        Trip trip = tripRepository.findFirstByContainer_ContainerCodeAndStatusInOrderByIdDesc(
                        containerNumber, ETA_ACTIVE_STATUSES)
                .orElseGet(() -> tripRepository
                        .findFirstByVehicleNumberIgnoreCaseAndStatusInOrderByStartTimeDescIdDesc(
                                containerNumber, ETA_ACTIVE_STATUSES)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "No active trip found for: " + containerNumber)));

        List<TripLocation> latestLocations = tripLocationRepository
                .findByTrip_IdOrderByTimestampDesc(trip.getId());
        TripLocation latestLocation = latestLocations.isEmpty() ? null : latestLocations.get(0);

        double currentLatitude = latestLocation != null
                ? latestLocation.getLatitude() : trip.getStartLat();
        double currentLongitude = latestLocation != null
                ? latestLocation.getLongitude() : trip.getStartLon();
        double remainingDistanceKm = haversine(
                currentLatitude, currentLongitude, trip.getEndLat(), trip.getEndLon());
        double currentSpeedKmPerHour = calculateCurrentSpeed(latestLocations);
        if (currentSpeedKmPerHour < 10.0) {
            currentSpeedKmPerHour = DEFAULT_SPEED_KM_PER_HOUR;
        }
        int estimatedMinutesRemaining = (int) Math.ceil(
                remainingDistanceKm / currentSpeedKmPerHour * 60.0);

        return TripEtaResponse.builder()
                .containerNumber(trip.getContainer().getContainerCode())
                .destination(trip.getEndLocationName() != null
                        ? trip.getEndLocationName() : trip.getContainer().getDestination())
                .remainingDistanceKm(remainingDistanceKm)
                .estimatedMinutesRemaining(estimatedMinutesRemaining)
                .estimatedArrival(LocalDateTime.now().plusMinutes(estimatedMinutesRemaining))
                .currentSpeedKmPerHour(currentSpeedKmPerHour)
                .build();
    }

    private double haversine(double latitude1, double longitude1,
                             double latitude2, double longitude2) {
        double latitudeDelta = Math.toRadians(latitude2 - latitude1);
        double longitudeDelta = Math.toRadians(longitude2 - longitude1);
        double a = Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2)
                + Math.cos(Math.toRadians(latitude1))
                * Math.cos(Math.toRadians(latitude2))
                * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);
        return 6371.0 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private double calculateCurrentSpeed(List<TripLocation> locations) {
        if (locations.size() < 2) {
            return 0.0;
        }

        TripLocation latest = locations.get(0);
        TripLocation previous = locations.get(1);
        long seconds = java.time.Duration.between(
                previous.getTimestamp(), latest.getTimestamp()).getSeconds();
        if (seconds <= 0) {
            return 0.0;
        }

        return haversine(
                previous.getLatitude(), previous.getLongitude(),
                latest.getLatitude(), latest.getLongitude()) / seconds * 3600.0;
    }

    @Transactional
    public Trip updateStatus(Long tripId, Long driverId, String requestedStatus) {

        Trip trip = tripRepository.findById(tripId)
            .orElseThrow(() -> new IllegalArgumentException(
                    "Trip not found with ID: " + tripId));

        String currentStatus = trip.getStatus();
        String status = requestedStatus == null ? "" : requestedStatus.trim().toUpperCase();

        if ("PLANNED".equals(currentStatus) && "ACTIVE".equals(status)) {
            trip.setStartTime(LocalDateTime.now());
        } else if ("ACTIVE".equals(currentStatus) && "COMPLETED".equals(status)) {
            trip.setEndTime(LocalDateTime.now());
        } else {
            throw new IllegalArgumentException(
                    "Trip status can only transition PLANNED -> ACTIVE -> COMPLETED");
        }

        trip.setStatus(status);
        return tripRepository.save(trip);
    }
}