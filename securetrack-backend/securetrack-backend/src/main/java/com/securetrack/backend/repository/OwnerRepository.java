package com.securetrack.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.securetrack.backend.models.Owner;

public interface OwnerRepository extends JpaRepository<Owner, Long> {
    Optional<Owner> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
