package com.securetrack.backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.securetrack.backend.models.*;
import com.securetrack.backend.repository.AuthorizedRfidRepository;
import com.securetrack.backend.repository.StaffRepository;
import com.securetrack.backend.repository.TripNotificationRepository;
import com.securetrack.backend.security.UserPrincipal;
import com.securetrack.backend.exception.ResourceNotFoundException;

@Service
public class TripNotificationService {
    private final TripNotificationRepository notifications;
    private final StaffRepository staffRepository;
    private final AuthorizedRfidRepository authorizedRfidRepository;

    @Autowired
    public TripNotificationService(TripNotificationRepository notifications, StaffRepository staffRepository,
            AuthorizedRfidRepository authorizedRfidRepository) {
        this.notifications = notifications;
        this.staffRepository = staffRepository;
        this.authorizedRfidRepository = authorizedRfidRepository;
    }

    public TripNotificationService(TripNotificationRepository notifications, StaffRepository staffRepository) {
        this(notifications, staffRepository, null);
    }

    @Transactional
    public void notifyLockChange(Container container, boolean locked, String rfid) {
        String title = locked ? "Container locked" : "Container unlocked";
        String message = "Container " + container.getContainerCode() + " was "
                + (locked ? "LOCKED" : "UNLOCKED")
                + (rfid == null || rfid.isBlank() ? "." : " using RFID "
                + inspectorName(rfid) + ".");
        LocalDateTime time = LocalDateTime.now();
        saveForOwnerAndCustomsOfficers(container, title, message, time);
    }

    @Transactional
    public void notifyRfidScan(Container container, String rfid, Boolean locked) {
        Inspector inspector = findRfidOwner(rfid);
        String inspectorName = inspector == null ? "Unknown"
                : inspector.getFirstname() + " " + inspector.getLastname();
        String title;
        String message;
        if (locked == null) {
            title = "RFID card detected";
            message = "RFID card owned by Inspector " + inspectorName + " was detected on container "
                    + container.getContainerCode() + " (State: UNKNOWN).";
        } else {
            title = locked ? "Container locked" : "Container unlocked";
            message = "Container " + container.getContainerCode() + " was "
                    + (locked ? "LOCKED" : "UNLOCKED")
                    + " using RFID Owner " + inspectorName + ".";
        }
        saveForOwnerAndCustomsOfficers(container, title, message, LocalDateTime.now(), inspector);
    }

    private String inspectorName(String rfid) {
        Inspector inspector = findRfidOwner(rfid);
        return inspector == null ? rfid.trim() : "owner " + inspector.getFirstname() + " " + inspector.getLastname();
    }

    private void saveForOwnerAndCustomsOfficers(Container container, String title, String message,
            LocalDateTime time) {
        saveForOwnerAndCustomsOfficers(container, title, message, time, null);
    }

    private void saveForOwnerAndCustomsOfficers(Container container, String title, String message,
            LocalDateTime time, Inspector rfidOwner) {
        List<TripNotification> recipients = new ArrayList<>();
        if (container.getOwner() != null) {
            recipients.add(createLockNotification("OWNER", container.getOwner().getOwnerId(), title, message, time));
        }
        for (Staff staff : staffRepository.findAll()) {
            if (staff.isActive() && staff.getRole() == StaffRole.CUSTOM_OFFICER) {
                recipients.add(createLockNotification("STAFF", staff.getStaffId(), title, message, time));
            }
        }
        if (!recipients.isEmpty()) {
            notifications.saveAll(recipients);
        }
    }

    private Inspector findRfidOwner(String rfid) {
        if (authorizedRfidRepository == null || rfid == null || rfid.isBlank()) {
            return null;
        }
        return authorizedRfidRepository.findFirstByRfidTagIgnoreCaseAndStatus(rfid.trim(), "ACTIVE")
                .map(AuthorizedRfid::getInspector)
                .orElse(null);
    }

    @Transactional
    public void notifyTamper(Container container, IoTModule module) {
        String message = "Possible tampering detected on container " + container.getContainerCode();
        if (TelemetryCoordinates.valid(module.getLatitude(), module.getLongitude())) {
            message += String.format(java.util.Locale.ROOT, " near %.6f, %.6f",
                    module.getLatitude(), module.getLongitude());
        }
        saveForOwnerAndCustomsOfficers(container, "Tamper detected", message + ".", LocalDateTime.now());
    }

    private TripNotification createLockNotification(String type, Long id, String title, String message, LocalDateTime time) {
        return TripNotification.builder().recipientType(type).recipientId(id)
                .title(title).message(message).createdAt(time).read(false).build();
    }

    @Transactional
    public void notifyStatusChange(Trip trip) {
        String title = "ACTIVE".equals(trip.getStatus()) ? "Trip started" : "Trip ended";
        String containerCode = trip.getContainer().getContainerCode();
        String message = "Vehicle " + trip.getVehicleNumber() + " "
                + ("ACTIVE".equals(trip.getStatus()) ? "started" : "completed")
                + " trip #" + trip.getId() + " for container " + containerCode + ".";
        LocalDateTime time = LocalDateTime.now();
        List<TripNotification> recipients = new ArrayList<>();
        Owner owner = trip.getContainer().getOwner();
        if (owner != null) recipients.add(create(trip, "OWNER", owner.getOwnerId(), title, message, time));
        for (Staff staff : staffRepository.findAll()) {
            if (staff.isActive() && (staff.getRole() == StaffRole.CUSTOM_OFFICER || staff.getRole() == StaffRole.INSPECTOR)) {
                recipients.add(create(trip, "STAFF", staff.getStaffId(), title, message, time));
            }
        }
        notifications.saveAll(recipients);
    }

    private TripNotification create(Trip trip, String type, Long id, String title, String message, LocalDateTime time) {
        return TripNotification.builder().recipientType(type).recipientId(id).tripId(trip.getId())
                .vehicleNumber(trip.getVehicleNumber()).title(title).message(message).createdAt(time).read(false).build();
    }

    @Transactional(readOnly = true)
    public List<TripNotification> list(UserPrincipal principal) {
        return notifications.findByRecipientTypeAndRecipientIdOrderByCreatedAtDescIdDesc(principal.getUserType().name(), principal.getId());
    }

    @Transactional
    public TripNotification markRead(Long id, UserPrincipal principal) {
        TripNotification notification = notifications.findByIdAndRecipientTypeAndRecipientId(id, principal.getUserType().name(), principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notification.setRead(true);
        return notifications.save(notification);
    }
}
