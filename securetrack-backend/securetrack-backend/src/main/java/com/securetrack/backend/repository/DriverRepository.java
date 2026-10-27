package com.securetrack.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.securetrack.backend.models.Driver;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Long> {
    Optional<Driver> findByUsername(String username);
    Optional<Driver> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByVehicleNo(String vehicleNo);
    Optional<Driver> findByVehicleNo(String vehicleNo);

    // Active trips වලට assign නොවූ, සක්‍රීය රියදුරන්ගේ වාහන ලබාගැනීම
    @Query("SELECT d FROM Driver d WHERE (d.status = 'ACTIVE' OR d.status = 'AVAILABLE') " +
           "AND TRIM(UPPER(d.vehicleNo)) NOT IN (" +
           "SELECT TRIM(UPPER(t.vehicleNumber)) FROM Trip t " +
           "WHERE t.vehicleNumber IS NOT NULL " +
           "AND UPPER(TRIM(t.status)) IN ('PLANNED', 'ACTIVE', 'IN_TRANSIT', 'STARTED', 'PENDING', 'ASSIGNED'))")
    List<Driver> findAvailableDrivers();
}
