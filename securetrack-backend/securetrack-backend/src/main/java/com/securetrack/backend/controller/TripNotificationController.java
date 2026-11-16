package com.securetrack.backend.controller;

import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.securetrack.backend.models.TripNotification;
import com.securetrack.backend.security.UserPrincipal;
import com.securetrack.backend.service.TripNotificationService;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("hasAnyRole('OWNER', 'CUSTOM_OFFICER', 'INSPECTOR', 'DRIVER')")
public class TripNotificationController {
    private final TripNotificationService service;

    public TripNotificationController(TripNotificationService service) {
        this.service = service;
    }

    @GetMapping
    public List<TripNotification> list(@AuthenticationPrincipal UserPrincipal principal) {
        return service.list(principal);
    }

    @PutMapping("/{id}/read")
    public TripNotification markRead(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return service.markRead(id, principal);
    }
}
