package com.securetrack.backend.controller;

import java.time.LocalDateTime;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securetrack.backend.exception.BadRequestException;
import com.securetrack.backend.models.ContainerLog;
import com.securetrack.backend.repository.AuthorizedRfidRepository;
import com.securetrack.backend.repository.ContainerLogRepository;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/rfid")
@RequiredArgsConstructor
public class RfidController {

    private final ContainerLogRepository logRepository;
    private final AuthorizedRfidRepository authorizedRfidRepository;

    @PostMapping("/unlock")
    public ResponseEntity<?> unlockContainer(@RequestBody RfidUnlockRequest request, Authentication authentication) {
        
        String inspectorUsername = (authentication != null && authentication.getName() != null) 
            ? authentication.getName() 
            : "Inspector";

        if (request.getContainerNumber() == null || request.getContainerNumber().isBlank()) {
            throw new BadRequestException("Container number is required.");
        }
        if (request.getRfidTag() == null || request.getRfidTag().isBlank()) {
            throw new BadRequestException("RFID tag code is required.");
        }

        String containerCode = request.getContainerNumber().trim();
        String rfidTag = request.getRfidTag().trim();

        // 1. අලුත් Table එකෙන් Active සහ Valid RFID එකක්ද කියා පරික්ෂා කිරීම
        boolean isValid = authorizedRfidRepository
            .existsByContainerCodeIgnoreCaseAndRfidTagIgnoreCaseAndStatus(containerCode, rfidTag, "ACTIVE");

        if (!isValid) {
            throw new BadRequestException("Unauthorized RFID tag or invalid container number!");
        }

        // 2. Valid නම් Log එක Save කිරීම
        ContainerLog accessLog = new ContainerLog();
        accessLog.setContainerNumber(containerCode.toUpperCase());
        accessLog.setRfidTag(rfidTag);
        accessLog.setInspectorUsername(inspectorUsername);
        accessLog.setAction("UNLOCK");
        accessLog.setTimestamp(LocalDateTime.now());
        
        logRepository.save(accessLog);

        return ResponseEntity.ok().body(new ApiResponse(true, "Container " + containerCode.toUpperCase() + " unlocked successfully by " + inspectorUsername));
    }

    @Data
    public static class RfidUnlockRequest {
        private String containerNumber;
        private String rfidTag;
    }

    @Data
    @RequiredArgsConstructor
    public static class ApiResponse {
        private final boolean success;
        private final String message;
    }
}