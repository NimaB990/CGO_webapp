package com.securetrack.backend.security;

import com.securetrack.backend.models.Driver;
import com.securetrack.backend.models.Owner;
import com.securetrack.backend.models.Staff;
import com.securetrack.backend.repository.DriverRepository;
import com.securetrack.backend.repository.OwnerRepository;
import com.securetrack.backend.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final StaffRepository staffRepository;
    private final DriverRepository driverRepository;
    private final OwnerRepository ownerRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Optional<Staff> staff = staffRepository.findByUsername(username);
        if (staff.isPresent()) {
            return UserPrincipal.fromStaff(staff.get());
        }

        Optional<Driver> driver = driverRepository.findByUsername(username);
        if (driver.isPresent()) {
            return UserPrincipal.fromDriver(driver.get());
        }

        Optional<Owner> owner = ownerRepository.findByUsername(username);
        if (owner.isPresent()) {
            return UserPrincipal.fromOwner(owner.get());
        }

        throw new UsernameNotFoundException("No user found for username: " + username);
    }
}
