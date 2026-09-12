package com.securetrack.backend.service;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.securetrack.backend.dto.UserCreateRequest;
import com.securetrack.backend.exception.BadRequestException;
import com.securetrack.backend.exception.ResourceNotFoundException;
import com.securetrack.backend.models.Admin;
import com.securetrack.backend.models.CustomOfficer;
import com.securetrack.backend.models.Driver;
import com.securetrack.backend.models.Inspector;
import com.securetrack.backend.models.Owner;
import com.securetrack.backend.models.Staff;
import com.securetrack.backend.models.StaffRole;
import com.securetrack.backend.repository.AdminRepository;
import com.securetrack.backend.repository.CustomOfficerRepository;
import com.securetrack.backend.repository.DriverRepository;
import com.securetrack.backend.repository.InspectorRepository;
import com.securetrack.backend.repository.OwnerRepository;
import com.securetrack.backend.repository.StaffRepository;

import lombok.RequiredArgsConstructor;

/**
 * UserManagementService - backs the "Manage Users" use case (Admin-only).
 * Creates/updates/deactivates Staff (Admin/CustomOfficer/Inspector), Driver
 * and Owner accounts.
 */
@Service
@RequiredArgsConstructor
public class UserManagementService {

    private final StaffRepository staffRepository;
    private final AdminRepository adminRepository;
    private final CustomOfficerRepository customOfficerRepository;
    private final InspectorRepository inspectorRepository;
    private final DriverRepository driverRepository;
    private final OwnerRepository ownerRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Object createUser(UserCreateRequest request) {
        validateUniqueness(request);
        String encodedPassword = passwordEncoder.encode(request.getPassword());

        return switch (request.getAccountType().toUpperCase()) {
            case "ADMIN" -> adminRepository.save(Admin.builder()
                    .username(request.getUsername())
                    .firstname(request.getFirstname())
                    .lastname(request.getLastname())
                    .email(request.getEmail())
                    .password(encodedPassword)
                    .role(StaffRole.ADMIN)
                    .active(true)
                    .build());

            case "CUSTOM_OFFICER" -> customOfficerRepository.save(CustomOfficer.builder()
                    .username(request.getUsername())
                    .firstname(request.getFirstname())
                    .lastname(request.getLastname())
                    .email(request.getEmail())
                    .password(encodedPassword)
                    .role(StaffRole.CUSTOM_OFFICER)
                    .active(true)
                    .build());

            case "INSPECTOR" -> inspectorRepository.save(Inspector.builder()
                    .username(request.getUsername())
                    .firstname(request.getFirstname())
                    .lastname(request.getLastname())
                    .email(request.getEmail())
                    .password(encodedPassword)
                    .role(StaffRole.INSPECTOR)
                    .active(true)
                    .build());

            case "DRIVER" -> {
                if (request.getVehicleNo() == null || request.getVehicleNo().isBlank()) {
                    throw new BadRequestException("vehicleNo is required for DRIVER accounts");
                }
                yield driverRepository.save(Driver.builder()
                        .username(request.getUsername())
                        .firstname(request.getFirstname())
                        .lastname(request.getLastname())
                        .email(request.getEmail())
                        .password(encodedPassword)
                        .vehicleNo(request.getVehicleNo())
                        .active(true)
                        .build());
            }

            case "OWNER" -> ownerRepository.save(Owner.builder()
                    .username(request.getUsername())
                    .firstname(request.getFirstname())
                    .lastname(request.getLastname())
                    .email(request.getEmail())
                    .password(encodedPassword)
                    .active(true)
                    .build());

            default -> throw new BadRequestException("Unknown accountType: " + request.getAccountType());
        };
    }

    private void validateUniqueness(UserCreateRequest request) {
        boolean usernameTaken = staffRepository.existsByUsername(request.getUsername())
                || driverRepository.existsByUsername(request.getUsername())
                || ownerRepository.existsByUsername(request.getUsername());
        if (usernameTaken) {
            throw new BadRequestException("Username already exists: " + request.getUsername());
        }

        boolean emailTaken = staffRepository.existsByEmail(request.getEmail())
                || driverRepository.existsByEmail(request.getEmail())
                || ownerRepository.existsByEmail(request.getEmail());
        if (emailTaken) {
            throw new BadRequestException("Email already registered: " + request.getEmail());
        }
    }

    public List<Staff> getAllStaff() {
        return staffRepository.findAll();
    }

    public List<Driver> getAllDrivers() {
        return driverRepository.findAll();
    }

    public List<Owner> getAllOwners() {
        return ownerRepository.findAll();
    }

    @Transactional
    public void deactivateStaff(Long staffId) {
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff not found: " + staffId));
        staff.setActive(false);
        staffRepository.save(staff);
    }

    @Transactional
    public void deleteStaff(Long staffId) {
        if (!staffRepository.existsById(staffId)) {
            throw new ResourceNotFoundException("Staff not found: " + staffId);
        }
        staffRepository.deleteById(staffId);
    }

    // --- අලුතින් එකතු කළ ක්‍රමවේද (Edit, Delete, Toggle Status) ---

    @Transactional
    public Object updateUser(String entityType, Long id, UserCreateRequest request) {
        if ("STAFF".equalsIgnoreCase(entityType)) {
            Staff staff = staffRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Staff not found: " + id));
            if (request.getFirstname() != null) staff.setFirstname(request.getFirstname());
            if (request.getLastname() != null) staff.setLastname(request.getLastname());
            if (request.getEmail() != null) staff.setEmail(request.getEmail());
            if (request.getAccountType() != null) {
                try {
                    staff.setRole(StaffRole.valueOf(request.getAccountType().toUpperCase()));
                } catch (IllegalArgumentException ignored) {}
            }
            return staffRepository.save(staff);
            
        } else if ("DRIVER".equalsIgnoreCase(entityType)) {
            Driver driver = driverRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found: " + id));
            if (request.getFirstname() != null) driver.setFirstname(request.getFirstname());
            if (request.getLastname() != null) driver.setLastname(request.getLastname());
            if (request.getEmail() != null) driver.setEmail(request.getEmail());
            if (request.getVehicleNo() != null) driver.setVehicleNo(request.getVehicleNo());
            return driverRepository.save(driver);
            
        } else if ("OWNER".equalsIgnoreCase(entityType)) {
            Owner owner = ownerRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Owner not found: " + id));
            if (request.getFirstname() != null) owner.setFirstname(request.getFirstname());
            if (request.getLastname() != null) owner.setLastname(request.getLastname());
            if (request.getEmail() != null) owner.setEmail(request.getEmail());
            return ownerRepository.save(owner);
        }
        throw new BadRequestException("Invalid User Type: " + entityType);
    }

    @Transactional
    public void deleteUser(String entityType, Long id) {
        if ("STAFF".equalsIgnoreCase(entityType)) {
            if (!staffRepository.existsById(id)) throw new ResourceNotFoundException("Staff not found: " + id);
            staffRepository.deleteById(id);
        } else if ("DRIVER".equalsIgnoreCase(entityType)) {
            if (!driverRepository.existsById(id)) throw new ResourceNotFoundException("Driver not found: " + id);
            driverRepository.deleteById(id);
        } else if ("OWNER".equalsIgnoreCase(entityType)) {
            if (!ownerRepository.existsById(id)) throw new ResourceNotFoundException("Owner not found: " + id);
            ownerRepository.deleteById(id);
        } else {
            throw new BadRequestException("Invalid User Type: " + entityType);
        }
    }

    @Transactional
    public void toggleUserStatus(String entityType, Long id, boolean isActive) {
        if ("STAFF".equalsIgnoreCase(entityType)) {
            Staff staff = staffRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Staff not found: " + id));
            staff.setActive(isActive);
            staffRepository.save(staff);
        } else if ("DRIVER".equalsIgnoreCase(entityType)) {
            Driver driver = driverRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found: " + id));
            driver.setActive(isActive);
            driverRepository.save(driver);
        } else if ("OWNER".equalsIgnoreCase(entityType)) {
            Owner owner = ownerRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Owner not found: " + id));
            owner.setActive(isActive);
            ownerRepository.save(owner);
        } else {
            throw new BadRequestException("Invalid User Type: " + entityType);
        }
    }
}