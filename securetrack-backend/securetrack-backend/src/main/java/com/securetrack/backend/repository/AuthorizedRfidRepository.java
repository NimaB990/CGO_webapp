package com.securetrack.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.securetrack.backend.models.AuthorizedRfid;

@Repository
public interface AuthorizedRfidRepository extends JpaRepository<AuthorizedRfid, Long> {

    // Container Code එකයි RFID Tag එකයි Match වෙන Active record එකක් තියෙනවද බැලීමට
    boolean existsByContainerCodeIgnoreCaseAndRfidTagIgnoreCaseAndStatus(String containerCode, String rfidTag, String status);

    Optional<AuthorizedRfid> findByContainerCodeIgnoreCase(String containerCode);
}