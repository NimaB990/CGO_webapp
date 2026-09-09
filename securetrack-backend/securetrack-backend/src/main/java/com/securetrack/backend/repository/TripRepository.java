package com.securetrack.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.securetrack.backend.models.Trip;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {
    
    // Spring Boot එකට තේරෙන්න 'Container' එකේ 'ContainerId' එකෙන් හොයන්න කියලා හරියටම දුන්නා
    List<Trip> findByContainer_ContainerIdOrderByIdDesc(Long containerId);
    List<Trip> findByContainer_ContainerIdAndContainer_Owner_OwnerIdOrderByIdDesc(Long containerId, Long ownerId);
    List<Trip> findByContainer_Owner_OwnerIdOrderByIdDesc(Long ownerId);
    Optional<Trip> findByTrackingReference(String trackingReference);
    Optional<Trip> findByTrackingReferenceAndContainer_Owner_OwnerId(
            String trackingReference, Long ownerId);
    @Query("SELECT t FROM Trip t "
            + "JOIN FETCH t.container c "
            + "LEFT JOIN FETCH c.iotModule "
            + "LEFT JOIN FETCH c.driver "
            + "WHERE c.containerCode = :containerCode "
            + "AND t.status <> :status ORDER BY t.id DESC")
    List<Trip> findActiveByContainerCode(@Param("containerCode") String containerCode,
                                         @Param("status") String status);

    @Query("SELECT t FROM Trip t "
            + "JOIN FETCH t.container c "
            + "LEFT JOIN FETCH c.iotModule "
            + "LEFT JOIN FETCH c.driver "
            + "WHERE c.containerId = :containerId "
            + "AND t.status <> :status ORDER BY t.id DESC")
    List<Trip> findActiveByContainerId(@Param("containerId") Long containerId,
                                       @Param("status") String status);

    @Query("SELECT t FROM Trip t "
            + "JOIN FETCH t.container c "
            + "LEFT JOIN FETCH c.iotModule "
            + "LEFT JOIN FETCH c.driver "
            + "WHERE c.containerCode = :containerCode "
            + "AND c.owner.ownerId = :ownerId "
            + "AND t.status <> :status ORDER BY t.id DESC")
    List<Trip> findActiveByContainerCodeAndOwner(
            @Param("containerCode") String containerCode,
            @Param("ownerId") Long ownerId,
            @Param("status") String status);
}