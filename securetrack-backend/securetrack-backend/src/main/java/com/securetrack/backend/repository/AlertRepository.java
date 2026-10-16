package com.securetrack.backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.securetrack.backend.models.Alert;
import com.securetrack.backend.models.AlertStatus;

public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByStatusOrderBySentAtDesc(AlertStatus status);
    List<Alert> findByContainer_ContainerIdOrderBySentAtDesc(Long containerId);
        List<Alert> findByContainer_ContainerIdAndSentAtGreaterThanEqualOrderBySentAtDesc(
            Long containerId, LocalDateTime startTime);
        List<Alert> findByContainer_ContainerIdAndContainer_Owner_OwnerIdOrderBySentAtDesc(
            Long containerId, Long ownerId);
    List<Alert> findByContainer_Owner_OwnerIdOrderBySentAtDesc(Long ownerId);
    List<Alert> findByStatusAndContainer_Owner_OwnerIdOrderBySentAtDesc(AlertStatus status, Long ownerId);
    List<Alert> findAllByOrderBySentAtDesc();
    List<Alert> findByVehicleNumberIgnoreCaseOrderBySentAtDesc(String vehicleNumber);

    @Query("SELECT DISTINCT a FROM Alert a "
            + "LEFT JOIN a.container c LEFT JOIN c.driver d "
            + "WHERE UPPER(TRIM(a.vehicleNumber)) = UPPER(TRIM(:vehicleNumber)) "
            + "OR UPPER(TRIM(d.vehicleNo)) = UPPER(TRIM(:vehicleNumber)) "
            + "OR EXISTS (SELECT t.id FROM Trip t WHERE t.container = a.container "
            + "AND UPPER(TRIM(t.vehicleNumber)) = UPPER(TRIM(:vehicleNumber))) "
            + "ORDER BY a.sentAt DESC")
    List<Alert> findByVehicleNumberOrContainerDriverVehicleNoOrderBySentAtDesc(
            @Param("vehicleNumber") String vehicleNumber);
}
