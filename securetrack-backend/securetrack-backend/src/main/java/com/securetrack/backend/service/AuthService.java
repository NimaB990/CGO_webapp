package com.securetrack.backend.service;

import com.securetrack.backend.dto.LoginRequest;
import com.securetrack.backend.dto.LoginResponse;
import com.securetrack.backend.models.Staff;
import com.securetrack.backend.repository.StaffRepository;
import com.securetrack.backend.security.JwtUtil;
import com.securetrack.backend.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final StaffRepository staffRepository;
    private final AuditManagementService auditManagementService;

    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = jwtUtil.generateToken(principal);

        if (principal.getUserType() == UserPrincipal.UserType.STAFF) {
            Staff staff = staffRepository.findById(principal.getId()).orElse(null);
            auditManagementService.logAction(staff, httpRequest, "LOGIN");
        }

        return LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(principal.getId())
                .username(principal.getUsername())
                .role(principal.getRole())
                .userType(principal.getUserType().name())
                .build();
    }
}
