package com.securetrack.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securetrack.backend.dto.ContainerInitRequest;
import com.securetrack.backend.models.Container;
import com.securetrack.backend.models.Staff;
import com.securetrack.backend.models.TrackingLog;
import com.securetrack.backend.repository.StaffRepository;
import com.securetrack.backend.security.UserPrincipal;
import com.securetrack.backend.service.ShipmentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/containers")
@RequiredArgsConstructor
public class ContainerController {

    private final ShipmentService shipmentService;
    private final StaffRepository staffRepository;

    @PostMapping("/initialize")
    public ResponseEntity<Container> initializeTracking(@Valid @RequestBody ContainerInitRequest request,
                                                          @AuthenticationPrincipal UserPrincipal principal) {
        Staff staff = resolveStaff(principal);
        Container container = shipmentService.initializeTracking(request, staff);
        return ResponseEntity.status(201).body(container);
    }

    @PostMapping("/{containerId}/complete")
    public ResponseEntity<Container> completeShipment(@PathVariable Long containerId,
                                                        @AuthenticationPrincipal UserPrincipal principal) {
        Staff staff = resolveStaff(principal);
        return ResponseEntity.ok(shipmentService.completeShipment(containerId, staff));
    }

    @GetMapping("/{containerId}/route")
    public ResponseEntity<List<TrackingLog>> viewAssignedRoute(@PathVariable Long containerId,
                                                                @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(shipmentService.getAssignedRoute(containerId, principal));
    }

    @GetMapping("/{containerId}")
    public ResponseEntity<Container> getContainer(@PathVariable Long containerId,
                                                   @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(shipmentService.getContainer(containerId, principal));
    }

    @GetMapping
    public ResponseEntity<List<Container>> getAllContainers(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(shipmentService.getAllContainers(principal));
    }

    private Staff resolveStaff(UserPrincipal principal) {
        if (principal == null || principal.getUserType() != UserPrincipal.UserType.STAFF) {
            return null;
        }
        return staffRepository.findById(principal.getId()).orElse(null);
    }
}
