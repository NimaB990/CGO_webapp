package com.securetrack.backend.dto;

import com.securetrack.backend.models.AlertSeverity;
import com.securetrack.backend.models.AlertStatus;
import com.securetrack.backend.models.AlertType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertResponse {
    private Long alertId;
    private Long containerId;
    private String containerCode;
    private String gpsLocation;
    private String message;
    private AlertType type;
    private AlertSeverity severity;
    private AlertStatus status;
    private LocalDateTime sentAt;
    private String vehicleNumber;
    private String investigationDescription;
    private LocalDateTime investigatedAt;
    private Long investigatedBy;
}
