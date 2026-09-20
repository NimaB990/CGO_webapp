package com.securetrack.backend.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.Data;

@RestController
@RequestMapping("/api/device")
@CrossOrigin(origins = "*")
public class DevicePairingController {

    // 1. Device Pairing API (කන්ටේනරයට IoT ඩිවයිස් එකක් සම්බන්ධ කිරීම)
    @PostMapping("/pair")
    public ResponseEntity<?> pairDevice(@RequestBody PairingRequest request) {
        // අනාගතයේදී: මෙහිදී Database එකේ Container වගුවට අදාළ IoT ID එක Save කරගත හැක
        
        System.out.println("Pairing IoT Module: " + request.getIotId() + " to Container: " + request.getContainerNo());
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Device " + request.getIotId() + " successfully paired with Container " + request.getContainerNo()
        ));
    }

    // 2. Device Unpairing API (ගමනාන්තයේදී ඩිවයිස් එක ඉවත් කිරීම)
    @PostMapping("/unpair")
    public ResponseEntity<?> unpairDevice(@RequestBody Map<String, String> request) {
        String containerNo = request.get("containerNo");
        
        System.out.println("Unpairing device from Container: " + containerNo);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Device successfully unpaired from Container " + containerNo
        ));
    }

    // 3. RFID Verification & Unlock (Inspector ගේ කාඩ් එකෙන් දොර විවෘත කිරීම)
    @PostMapping("/unlock")
    public ResponseEntity<?> unlockContainer(@RequestBody UnlockRequest request) {
        System.out.println("RFID Scan Received: " + request.getRfidTag() + " for Container: " + request.getContainerNo());
        
        // උදාහරණයක් ලෙස "TAG-12345" යනු නිවැරදි Inspector RFID කාඩ්පත යැයි සිතමු
        // (අනාගතයේදී මෙය Database එකේ Inspector ගේ RFID අංකය සමඟ පරීක්ෂා කළ හැක)
        if ("TAG-12345".equals(request.getRfidTag())) {
            
            // සැබෑ ඩිවයිස් එකක් තිබේ නම්: මෙතැනින් MQTT හරහා "UNLOCK" කමාන්ඩ් එක යවනු ලබයි
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "RFID Verified! Container " + request.getContainerNo() + " Door Unlocked.",
                "status", "UNLOCKED"
            ));
        } else {
            return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "Invalid RFID Tag. Access Denied!",
                "status", "LOCKED"
            ));
        }
    }

    // --- DTO Classes (දත්ත ලබාගැනීම සඳහා) ---

    @Data
    static class PairingRequest {
        private String containerNo;
        private String iotId;
    }

    @Data
    static class UnlockRequest {
        private String containerNo;
        private String rfidTag;
    }
}