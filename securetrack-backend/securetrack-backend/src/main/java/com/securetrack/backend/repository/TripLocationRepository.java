package com.securetrack.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.securetrack.backend.models.TripLocation;

public interface TripLocationRepository extends JpaRepository<TripLocation, Long> {
    List<TripLocation> findByTrip_IdOrderByTimestampAsc(Long tripId);
}