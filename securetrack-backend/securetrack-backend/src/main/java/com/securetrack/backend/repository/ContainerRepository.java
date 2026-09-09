package com.securetrack.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.securetrack.backend.models.Container;
import com.securetrack.backend.models.ContainerStatus;

public interface ContainerRepository extends JpaRepository<Container, Long> {
    @Query("SELECT c FROM Container c LEFT JOIN FETCH c.iotModule WHERE c.containerId = :id")
    Optional<Container> findByIdWithIotModule(@Param("id") Long id);

    Optional<Container> findByContainerCode(String containerCode);
    Optional<Container> findByIotModule_ModuleId(Long moduleId);
    Optional<Container> findByIotModule_DeviceUid(String deviceUid);
    List<Container> findByStatus(ContainerStatus status);
    List<Container> findByOwner_OwnerId(Long ownerId);
    Optional<Container> findByContainerIdAndOwner_OwnerId(Long containerId, Long ownerId);
    List<Container> findByDriver_DriverId(Long driverId);
}
