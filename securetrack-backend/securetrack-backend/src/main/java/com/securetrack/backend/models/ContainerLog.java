package com.securetrack.backend.models;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "container_access_logs")
@Data
public class ContainerLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String containerNumber;

    @Column(nullable = false)
    private String rfidTag;

    @Column(nullable = false)
    private String inspectorUsername;

    @Column(nullable = false)
    private String action; // උදා: "UNLOCK"

    @Column(nullable = false)
    private LocalDateTime timestamp;
}