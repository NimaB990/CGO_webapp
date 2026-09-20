package com.securetrack.backend.controller;

import com.securetrack.backend.exception.ResourceNotFoundException;
import com.securetrack.backend.models.Geofence;
import com.securetrack.backend.repository.GeofenceRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/geofences")
@RequiredArgsConstructor
public class GeofenceController {

    private final GeofenceRepository geofenceRepository;

    @GetMapping
    public ResponseEntity<List<Geofence>> getAll() {
        return ResponseEntity.ok(geofenceRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Geofence> getById(@PathVariable Long id) {
        return ResponseEntity.ok(geofenceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Geofence not found: " + id)));
    }

    @PostMapping
    public ResponseEntity<Geofence> create(@Valid @RequestBody Geofence geofence) {
        geofence.setGeofenceId(null);
        return ResponseEntity.status(201).body(geofenceRepository.save(geofence));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Geofence> update(@PathVariable Long id, @Valid @RequestBody Geofence updated) {
        Geofence existing = geofenceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Geofence not found: " + id));

        existing.setDestination(updated.getDestination());
        existing.setLatitude(updated.getLatitude());
        existing.setLongitude(updated.getLongitude());
        existing.setSignalStrength(updated.getSignalStrength());
        existing.setStartPoint(updated.getStartPoint());
        existing.setEndPoint(updated.getEndPoint());
        existing.setContainerNo(updated.getContainerNo());
        existing.setIotId(updated.getIotId());

        return ResponseEntity.ok(geofenceRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!geofenceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Geofence not found: " + id);
        }
        geofenceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
