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
import com.securetrack.backend.repository.ContainerLogRepository;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/rfid")
@RequiredArgsConstructor
public class RfidController {

    private final ContainerLogRepository logRepository;

    @PostMapping("/unlock")
    public ResponseEntity<?> unlockContainer(@RequestBody RfidUnlockRequest request, Authentication authentication) {
        
        // 1. ලොග් වී සිටින ඉන්ස්පෙක්ටර්ගේ නම ලබා ගැනීම (JWT Token එක හරහා)
        String inspectorUsername = (authentication != null && authentication.getName() != null) 
            ? authentication.getName() 
            : "Inspector";

        if (request.getContainerNumber() == null || request.getContainerNumber().isBlank()) {
            throw new BadRequestException("Container number is required.");
        }
        if (request.getRfidTag() == null || request.getRfidTag().isBlank()) {
            throw new BadRequestException("RFID tag code is required.");
        }

        // 2. මෙතැනදී වැලිඩ් RFID ටැග් එකක්ද යන්න ඩේටාබේස් එක පරීක්ෂා කර තහවුරු කරගත හැක.
        // (අවශ්‍ය නම් අනාථ වළක්වා ගැනීමට මෙහි custom check එකක් එකතු කළ හැක)

        // 3. සාර්ථකව අන්ලොක් වූ පසු Reports සඳහා ඩේටාබේස් එකේ ලොග් එක සේව් කිරීම
        ContainerLog accessLog = new ContainerLog();
        accessLog.setContainerNumber(request.getContainerNumber().toUpperCase().trim());
        accessLog.setRfidTag(request.getRfidTag().trim());
        accessLog.setInspectorUsername(inspectorUsername);
        accessLog.setAction("UNLOCK");
        accessLog.setTimestamp(LocalDateTime.now());
        
        logRepository.save(accessLog);

        return ResponseEntity.ok().body(new ApiResponse(true, "Container unlocked successfully by " + inspectorUsername));
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