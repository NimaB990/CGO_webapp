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
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    // Active containers වලට assign නොවූ, සක්‍රීය රියදුරන්ගේ වාහන ලබාගැනීම
    @Query("SELECT d FROM Driver d WHERE d.active = true AND d.driverId NOT IN " +
           "(SELECT c.driver.driverId FROM Container c WHERE c.driver IS NOT NULL AND c.status IN ('PENDING', 'IN_TRANSIT'))")
    List<Driver> findAvailableDrivers();
}