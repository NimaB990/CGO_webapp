package com.securetrack.backend.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tracking_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "gps_location", length = 100)
    private String gpsLocation;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "container_id", nullable = false)
    private Container container;

    @PrePersist
    protected void onCreate() {
        if (this.startTime == null) {
            this.startTime = LocalDateTime.now();
        }
    }
}
