package com.securetrack.backend.models;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trip")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_reference", nullable = false, unique = true, length = 36)
    private String trackingReference;

    // Container එකත් එක්ක තියෙන සම්බන්ධය (Many Trips -> One Container)
    @ManyToOne
    @JoinColumn(name = "container_id", nullable = false)
    private Container container;

    @Column(name = "vehicle_number", nullable = false, length = 20)
    private String vehicleNumber;

    // ස්ථාන වල නම් (පෙන්නන්න ලේසි වෙන්න)
    private String startLocationName; // උදා: කොළඹ වරාය
    private String endLocationName;   // උදා: කටුනායක FTZ

    // ආරම්භක ඛණ්ඩාංක
    private double startLat;
    private double startLon;

    // අවසාන ඛණ්ඩාංක
    private double endLat;
    private double endLon;

    // OSRM එකෙන් එන සම්පූර්ණ පාර JSON Array එකක් විදිහට Save කරන්න
    @Column(columnDefinition = "LONGTEXT")
    private String routeCoordinatesJson;

    // 🔴 අලුතින් එකතු කළ කොටස: ආරක්ෂිත මාර්ග කලාපයේ සීමාව (මීටර් වලින්)
    @Column(name = "allowed_deviation_meters")
    @Builder.Default
    private Integer allowedDeviationMeters = 200; 

    // ගමනේ තත්ත්වය (PLANNED, IN_TRANSIT, COMPLETED, FLAGGED)
    private String status;

    // ගමන් ආරම්භ කළ සහ අවසන් කළ වෙලාවන්
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @PrePersist
    protected void onCreate() {
        if (trackingReference == null || trackingReference.isBlank()) {
            trackingReference = UUID.randomUUID().toString();
        }
    }
}