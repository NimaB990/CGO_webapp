package com.securetrack.backend.service;

import com.securetrack.backend.models.AuditLog;
import com.securetrack.backend.models.Staff;
import com.securetrack.backend.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditManagementService {

    private static final Logger log = LoggerFactory.getLogger(AuditManagementService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditLog logAction(Staff staff, String ipAddress, String action) {
        AuditLog auditLog = AuditLog.builder()
                .staff(staff)
                .ipAddress(ipAddress)
                .action(action)
                .build();
        AuditLog saved = auditLogRepository.save(auditLog);
        log.info("AUDIT | staff={} | ip={} | action={}",
                staff != null ? staff.getUsername() : "SYSTEM", ipAddress, action);
        return saved;
    }

    public AuditLog logAction(Staff staff, HttpServletRequest request, String action) {
        return logAction(staff, extractClientIp(request), action);
    }

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAllByOrderByActiveTimeDesc();
    }

    public List<AuditLog> getLogsForStaff(Long staffId) {
        return auditLogRepository.findByStaff_StaffIdOrderByActiveTimeDesc(staffId);
    }

    public static String extractClientIp(HttpServletRequest request) {
        if (request == null) return "UNKNOWN";
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
