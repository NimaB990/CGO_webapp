package com.securetrack.backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

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
}
