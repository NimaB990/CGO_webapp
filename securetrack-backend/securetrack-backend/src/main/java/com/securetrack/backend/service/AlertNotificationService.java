package com.securetrack.backend.service;

import com.securetrack.backend.models.Alert;
import com.securetrack.backend.models.AlertSeverity;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AlertNotificationService {

    private static final Logger log = LoggerFactory.getLogger(AlertNotificationService.class);

    private final JavaMailSender mailSender;

    @Value("${twilio.account.sid:}")
    private String twilioAccountSid;

    @Value("${twilio.auth.token:}")
    private String twilioAuthToken;

    @Value("${twilio.phone.number:}")
    private String twilioPhoneNumber;

    private boolean isTwilioInitialized = false;

    private void initTwilio() {
        if (!isTwilioInitialized && twilioAccountSid != null && !twilioAccountSid.isEmpty() && !twilioAccountSid.startsWith("your_")) {
            try {
                Twilio.init(twilioAccountSid, twilioAuthToken);
                isTwilioInitialized = true;
            } catch (Exception e) {
                log.error("Failed to initialize Twilio: {}", e.getMessage());
            }
        }
    }

    @Async
    public void notify(Alert alert) {
        System.out.println(">>> NOTIFY METHOD TRIGGERED FOR: " + alert.getType() + " | SEVERITY: " + alert.getSeverity());
        if (alert.getSeverity() == AlertSeverity.HIGH || alert.getSeverity() == AlertSeverity.CRITICAL) {
            dispatchHighPriority(alert);
        } else {
            dispatchStandard(alert);
        }
    }

    private void dispatchHighPriority(Alert alert) {
        String containerCode = alert.getContainer() != null ? alert.getContainer().getContainerCode() : "N/A";
        String messageBody = String.format("HIGH-PRIORITY ALERT!\nContainer: %s\nType: %s\nMessage: %s\nLocation: %s",
                containerCode, alert.getType(), alert.getMessage(), alert.getGpsLocation());

        log.warn("[HIGH-PRIORITY ALERT] container={} type={} message='{}' location={}",
                containerCode, alert.getType(), alert.getMessage(), alert.getGpsLocation());

        System.out.println(">>> ATTEMPTING TO SEND EMAIL TO YOUR GMAIL...");

        sendEmailNotification("Chathuranganimantha990@gmail.com", "HIGH SECURITY ALERT: " + alert.getType(), messageBody);
    }

    private void dispatchStandard(Alert alert) {
        String containerCode = alert.getContainer() != null ? alert.getContainer().getContainerCode() : "N/A";
        log.info("[ALERT] container={} type={} message='{}'",
                containerCode, alert.getType(), alert.getMessage());
    }

    public void sendEmailNotification(String toEmail, String subject, String messageBody) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(messageBody);
            mailSender.send(message);
            log.info("Email sent successfully to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendSmsNotification(String toPhoneNumber, String messageBody) {
        try {
            initTwilio();
            if (!isTwilioInitialized) {
                log.info("[Mock SMS] To: {} | Body: {}", toPhoneNumber, messageBody);
                return;
            }
            Message.creator(
                new PhoneNumber(toPhoneNumber),
                new PhoneNumber(twilioPhoneNumber),
                messageBody
            ).create();
            log.info("SMS sent successfully to {}", toPhoneNumber);
        } catch (Exception e) {
            log.error("Failed to send SMS to {}: {}", toPhoneNumber, e.getMessage());
        }
    }
}