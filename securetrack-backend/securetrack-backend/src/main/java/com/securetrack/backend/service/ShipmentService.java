package com.securetrack.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.securetrack.backend.dto.ContainerInitRequest;
import com.securetrack.backend.exception.BadRequestException;
import com.securetrack.backend.exception.ResourceNotFoundException;
import com.securetrack.backend.models.Container;
import com.securetrack.backend.models.ContainerStatus;
import com.securetrack.backend.models.Driver;
import com.securetrack.backend.models.Geofence;
import com.securetrack.backend.models.IoTModule;
import com.securetrack.backend.models.Owner;
import com.securetrack.backend.models.Staff;
import com.securetrack.backend.models.TrackingLog;
import com.securetrack.backend.repository.ContainerRepository;
import com.securetrack.backend.repository.DriverRepository;
import com.securetrack.backend.repository.GeofenceRepository;
import com.securetrack.backend.repository.IoTModuleRepository;
import com.securetrack.backend.repository.OwnerRepository;
import com.securetrack.backend.repository.TrackingLogRepository;
import com.securetrack.backend.security.UserPrincipal;

import lombok.RequiredArgsConstructor;

/**
 * ShipmentService - implements the "Initialize Container Tracking" and
 * "Complete Shipment / Unlock Seal" use cases which frame the start and end
 * of a Container's monitored lifecycle.
 */
@Service
@RequiredArgsConstructor
public class ShipmentService {

    private final ContainerRepository containerRepository;
    private final IoTModuleRepository ioTModuleRepository;
    private final OwnerRepository ownerRepository;
    private final DriverRepository driverRepository;
    private final GeofenceRepository geofenceRepository;
    private final TrackingLogRepository trackingLogRepository;
    private final AuditManagementService auditManagementService;

    @Transactional
    public Container initializeTracking(ContainerInitRequest request, Staff initiatedBy) {
        if (containerRepository.findByContainerCode(request.getContainerCode()).isPresent()) {
            throw new BadRequestException("Container code already in use: " + request.getContainerCode());
        }

        IoTModule module = ioTModuleRepository.findByDeviceUid(request.getDeviceUid())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No registered IoT module found for device UID: " + request.getDeviceUid()));

        if (containerRepository.findByIotModule_ModuleId(module.getModuleId()).isPresent()) {
            throw new BadRequestException("IoT module " + request.getDeviceUid() + " is already assigned to a container");
        }

        Container container = Container.builder()
                .containerCode(request.getContainerCode())
                .destination(request.getDestination())
                .assignedRoute(request.getAssignedRoute())
                .iotModule(module)
                .status(ContainerStatus.IN_TRANSIT)
                .build();

        if (request.getOwnerId() != null) {
            Owner owner = ownerRepository.findById(request.getOwnerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Owner not found: " + request.getOwnerId()));
            container.setOwner(owner);
        }

        if (request.getDriverId() != null) {
            Driver driver = driverRepository.findById(request.getDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found: " + request.getDriverId()));
            container.setDriver(driver);
        }

        if (request.getGeofenceId() != null) {
            Geofence geofence = geofenceRepository.findById(request.getGeofenceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Geofence not found: " + request.getGeofenceId()));
            container.setGeofence(geofence);
        }

        Container saved = containerRepository.save(container);

        // Seed the first tracking checkpoint marking the start of the journey.
        TrackingLog startLog = TrackingLog.builder()
                .container(saved)
                .startTime(LocalDateTime.now())
                .gpsLocation(geofenceStartOrNull(saved.getGeofence()))
                .build();
        trackingLogRepository.save(startLog);

        auditManagementService.logAction(initiatedBy, (String) null,
                "INITIALIZE_TRACKING container=" + saved.getContainerCode());

        return saved;
    }

    @Transactional
    public Container completeShipment(Long containerId, Staff completedBy) {
        Container container = containerRepository.findById(containerId)
                .orElseThrow(() -> new ResourceNotFoundException("Container not found: " + containerId));

        if (container.getStatus() == ContainerStatus.COMPLETED) {
            throw new BadRequestException("Container " + container.getContainerCode() + " is already completed");
        }

        container.setStatus(ContainerStatus.COMPLETED);
        container.setCompletedAt(LocalDateTime.now());
        Container saved = containerRepository.save(container);

        // Close out the most recent open tracking log with an end timestamp.
        List<TrackingLog> logs = trackingLogRepository
                .findByContainer_ContainerIdOrderByStartTimeDesc(container.getContainerId());
        if (!logs.isEmpty() && logs.get(0).getEndTime() == null) {
            TrackingLog latest = logs.get(0);
            latest.setEndTime(LocalDateTime.now());
            trackingLogRepository.save(latest);
        }

        auditManagementService.logAction(completedBy, (String) null,
                "COMPLETE_SHIPMENT_UNLOCK_SEAL container=" + saved.getContainerCode());

        return saved;
    }

    public Container getContainer(Long containerId, UserPrincipal principal) {
        return (ownerScoped(principal)
            ? containerRepository.findByContainerIdAndOwner_OwnerId(containerId, principal.getId())
            : containerRepository.findById(containerId))
            .orElseThrow(() -> new ResourceNotFoundException("Container not found: " + containerId));
    }

    public List<Container> getAllContainers(UserPrincipal principal) {
        return ownerScoped(principal)
                ? containerRepository.findByOwner_OwnerId(principal.getId())
                : containerRepository.findAll();
    }

    public List<TrackingLog> getAssignedRoute(Long containerId, UserPrincipal principal) {
        getContainer(containerId, principal);
        return trackingLogRepository.findByContainer_ContainerIdOrderByStartTimeDesc(containerId);
    }

    private boolean ownerScoped(UserPrincipal principal) {
        return principal != null && "OWNER".equals(principal.getRole());
    }

    private String geofenceStartOrNull(Geofence geofence) {
        if (geofence == null) return null;
        return geofence.getLatitude() + "," + geofence.getLongitude();
    }
}
