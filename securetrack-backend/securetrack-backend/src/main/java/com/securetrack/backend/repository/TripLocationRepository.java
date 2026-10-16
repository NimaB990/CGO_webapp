package com.securetrack.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.securetrack.backend.models.TripLocation;

public interface TripLocationRepository extends JpaRepository<TripLocation, Long> {
    Optional<TripLocation> findFirstByTrip_IdOrderByTimestampDesc(Long tripId);
    List<TripLocation> findByTrip_IdOrderByTimestampDesc(Long tripId);
    List<TripLocation> findByTrip_IdOrderByTimestampAsc(Long tripId);
}