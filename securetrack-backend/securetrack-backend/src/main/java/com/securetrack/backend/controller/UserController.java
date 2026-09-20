package com.securetrack.backend.controller;

import java.security.Principal;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securetrack.backend.dto.ProfileDTO;
import com.securetrack.backend.models.Staff;
import com.securetrack.backend.repository.StaffRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class UserController {

    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/me")
    public ProfileDTO getMyProfile(Principal principal) {

        Staff staff = staffRepository.findByUsername(principal.getName()).orElse(null); 
        ProfileDTO dto = new ProfileDTO();

        if (staff != null) {
            dto.setFirstName(staff.getFirstname());
            dto.setLastName(staff.getLastname());
            dto.setEmail(staff.getEmail());
            dto.setPhone("+94 77 1234567"); 

            dto.setEmailAlerts(staff.isEmailAlerts());
            dto.setSmsAlerts(staff.isSmsAlerts());
            dto.setSystemAlerts(staff.isSystemAlerts());
            dto.setTwoFactorAuth(staff.isTwoFactorAuth());
            dto.setLanguage(staff.getLanguage() != null ? staff.getLanguage() : "English");
            dto.setTimezone(staff.getTimezone() != null ? staff.getTimezone() : "Asia/Colombo");
        }

        return dto;
    }

    @PutMapping("/me")
    public ProfileDTO updateProfile(@RequestBody ProfileDTO dto, Principal principal) {
        Staff staff = staffRepository.findByUsername(principal.getName()).orElse(null);
        if (staff != null) {
            staff.setFirstname(dto.getFirstName());
            staff.setLastname(dto.getLastName());
            staff.setEmail(dto.getEmail());

            staff.setEmailAlerts(dto.isEmailAlerts());
            staff.setSmsAlerts(dto.isSmsAlerts());
            staff.setSystemAlerts(dto.isSystemAlerts());
            staff.setTwoFactorAuth(dto.isTwoFactorAuth());
            staff.setLanguage(dto.getLanguage());
            staff.setTimezone(dto.getTimezone());

            staffRepository.save(staff);
        }
        return dto;
    }

    @PostMapping("/me/password")
    public ResponseEntity<?> changePassword(@RequestBody ProfileDTO.PasswordChangeRequest req, Principal principal) {
        Staff staff = staffRepository.findByUsername(principal.getName()).orElse(null);
        if (staff != null) {
            if (passwordEncoder.matches(req.getCurrentPassword(), staff.getPassword())) {
                staff.setPassword(passwordEncoder.encode(req.getNewPassword()));
                staffRepository.save(staff);
                return ResponseEntity.ok().body("Password Updated");
            } else {
                return ResponseEntity.badRequest().body("Current password is incorrect");
            }
        }
        return ResponseEntity.badRequest().body("User not found");
    }
}