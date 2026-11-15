package com.securetrack.backend.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "driver")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "driver_id")
    private Long driverId;

    @Column(name = "vehicle_no", nullable = false, length = 20)
    private String vehicleNo;

    @Column(name = "vehicle_model", length = 100)
    private String vehicleModel;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "nic", length = 30)
    private String nic;

    @Column(name = "status", length = 20)
    private String status;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, length = 50)
    private String firstname;

    @Column(nullable = false, length = 50)
    private String lastname;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Builder.Default
    private boolean active = true;

    @JsonIgnore
    @OneToMany(mappedBy = "driver")
    private List<Container> containers = new ArrayList<>();
}
