package com.securetrack.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.securetrack.backend.models.Trip;
import com.securetrack.backend.repository.TripRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;

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

    // @Transactional
    // public Trip updateStatus(Long tripId, Long driverId, String requestedStatus) {
    //     Trip trip = tripRepository.findByIdAndDriverId(tripId, driverId)
    //             .orElseThrow(() -> new IllegalArgumentException(
    //                     "Trip not found for the authenticated driver: " + tripId));
    //     String currentStatus = trip.getStatus();
    //     String status = requestedStatus == null ? "" : requestedStatus.trim().toUpperCase();
    @Transactional
    public Trip updateStatus(Long tripId, Long driverId, String requestedStatus) {
    // Driver ID පරීක්ෂාව ඉවත් කර, Trip ID එකෙන් පමණක් ගමන් වාරය සෙවීම
        Trip trip = tripRepository.findById(tripId)
            .orElseThrow(() -> new IllegalArgumentException(
                    "Trip not found with ID: " + tripId));

        String currentStatus = trip.getStatus();
        String status = requestedStatus == null ? "" : requestedStatus.trim().toUpperCase();
    
    // ... (මෙතැනින් පහළ ඇති ඔබගේ ඉතිරි කේතය එලෙසම තබන්න)

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