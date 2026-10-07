package com.securetrack.backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "authorized_rfid_tags")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthorizedRfid {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "container_code", nullable = false, length = 50)
    private String containerCode;

    @Column(name = "rfid_tag", nullable = false, length = 50)
    private String rfidTag;

    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, INACTIVE
}