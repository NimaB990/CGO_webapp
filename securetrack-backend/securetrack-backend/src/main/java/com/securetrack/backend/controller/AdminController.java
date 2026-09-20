package com.securetrack.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securetrack.backend.dto.ApiResponse;
import com.securetrack.backend.dto.UserCreateRequest;
import com.securetrack.backend.models.Driver;
import com.securetrack.backend.models.Owner;
import com.securetrack.backend.models.Staff;
import com.securetrack.backend.service.AuditManagementService;
import com.securetrack.backend.service.UserManagementService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserManagementService userManagementService;
    private final AuditManagementService auditManagementService;

    @PostMapping("/users")
    public ResponseEntity<Object> createUser(@Valid @RequestBody UserCreateRequest request) {
        Object created = userManagementService.createUser(request);
        return ResponseEntity.status(201).body(created);
    }

    @GetMapping("/users/staff")
    public ResponseEntity<List<Staff>> getAllStaff() {
        return ResponseEntity.ok(userManagementService.getAllStaff());
    }

    @GetMapping("/users/drivers")
    public ResponseEntity<List<Driver>> getAllDrivers() {
        return ResponseEntity.ok(userManagementService.getAllDrivers());
    }

    @GetMapping("/users/owners")
    public ResponseEntity<List<Owner>> getAllOwners() {
        return ResponseEntity.ok(userManagementService.getAllOwners());
    }

    @PutMapping("/users/staff/{staffId}/deactivate")
    public ResponseEntity<ApiResponse> deactivateStaff(@PathVariable Long staffId) {
        userManagementService.deactivateStaff(staffId);
        return ResponseEntity.ok(ApiResponse.ok("Staff account deactivated"));
    }

    @DeleteMapping("/users/staff/{staffId}")
    public ResponseEntity<ApiResponse> deleteStaff(@PathVariable Long staffId) {
        userManagementService.deleteStaff(staffId);
        return ResponseEntity.ok(ApiResponse.ok("Staff account deleted"));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<?> getAuditLogs() {
        return ResponseEntity.ok(auditManagementService.getAllLogs());
    }

    @PutMapping("/users/{entityType}/{id}")
    public ResponseEntity<Object> updateUser(@PathVariable String entityType, @PathVariable Long id, @RequestBody UserCreateRequest request) {
        return ResponseEntity.ok(userManagementService.updateUser(entityType, id, request));
    }

    @DeleteMapping("/users/{entityType}/{id}")
    public ResponseEntity<ApiResponse> deleteUser(@PathVariable String entityType, @PathVariable Long id) {
        userManagementService.deleteUser(entityType, id);
        return ResponseEntity.ok(ApiResponse.ok("User deleted successfully"));
    }

    @PutMapping("/users/{entityType}/{id}/status")
    public ResponseEntity<ApiResponse> toggleUserStatus(@PathVariable String entityType, @PathVariable Long id, @org.springframework.web.bind.annotation.RequestParam boolean isActive) {
        userManagementService.toggleUserStatus(entityType, id, isActive);
        return ResponseEntity.ok(ApiResponse.ok("User status updated successfully"));
    }
}
