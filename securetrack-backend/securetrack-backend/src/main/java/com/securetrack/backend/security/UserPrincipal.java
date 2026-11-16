package com.securetrack.backend.security;

import com.securetrack.backend.models.Driver;
import com.securetrack.backend.models.Owner;
import com.securetrack.backend.models.Staff;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class UserPrincipal implements UserDetails {

    public enum UserType { STAFF, DRIVER, OWNER }

    private final Long id;
    private final String username;
    private final String password;
    private final String role;
    private final UserType userType;
    private final boolean active;

    public UserPrincipal(Long id, String username, String password, String role, UserType userType, boolean active) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.role = role;
        this.userType = userType;
        this.active = active;
    }

    public static UserPrincipal fromStaff(Staff staff) {
        return new UserPrincipal(
                staff.getStaffId(), staff.getUsername(), staff.getPassword(),
                staff.getRole().name(), UserType.STAFF, staff.isActive());
    }

    public static UserPrincipal fromDriver(Driver driver) {
        return new UserPrincipal(
                driver.getDriverId(), driver.getUsername(), driver.getPassword(),
                "DRIVER", UserType.DRIVER, driver.isActive());
    }

    public static UserPrincipal fromOwner(Owner owner) {
        return new UserPrincipal(
                owner.getOwnerId(), owner.getUsername(), owner.getPassword(),
                "OWNER", UserType.OWNER, owner.isActive());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return active; }
}
