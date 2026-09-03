package com.securetrack.backend.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Optional;

import org.eclipse.paho.mqttv5.client.IMqttToken;
import org.eclipse.paho.mqttv5.client.MqttAsyncClient;
import org.eclipse.paho.mqttv5.client.MqttCallback;
import org.eclipse.paho.mqttv5.client.MqttConnectionOptions;
import org.eclipse.paho.mqttv5.client.MqttDisconnectResponse;
import org.eclipse.paho.mqttv5.client.persist.MemoryPersistence;
import org.eclipse.paho.mqttv5.common.MqttException;
import org.eclipse.paho.mqttv5.common.MqttMessage;
import org.eclipse.paho.mqttv5.common.packet.MqttProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.securetrack.backend.dto.TelemetryPayload;
import com.securetrack.backend.models.Container;
import com.securetrack.backend.models.IoTModule;
import com.securetrack.backend.models.TrackingLog;
import com.securetrack.backend.repository.ContainerRepository;
import com.securetrack.backend.repository.IoTModuleRepository;
import com.securetrack.backend.repository.TrackingLogRepository;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
/**
 * MqttTelemetryService - subscribes to the MQTT 5.0 broker topic that ESP32
 * edge devices publish GPS / magnetic reed-switch / ambient-light telemetry
 * to, normalizes each JSON payload, updates the corresponding IoTModule &
 * TrackingLog, and hands off to SecurityMonitoringService and
 * RouteVerificationService for downstream analysis.
 *
 * Uses the Eclipse Paho MQTTv5 async client directly (rather than
 * spring-integration-mqtt, which only supports MQTT 3.1.1) to satisfy the
 * MQTT 5.0 protocol requirement.
 */
@Service
@RequiredArgsConstructor
public class MqttTelemetryService implements MqttCallback {

    private static final Logger log = LoggerFactory.getLogger(MqttTelemetryService.class);

    private final IoTModuleRepository ioTModuleRepository;
    private final ContainerRepository containerRepository;
    private final TrackingLogRepository trackingLogRepository;
    private final SecurityMonitoringService securityMonitoringService;
    private final RouteVerificationService routeVerificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${securetrack.mqtt.broker-url}")
    private String brokerUrl;

    @Value("${securetrack.mqtt.client-id}")
    private String clientId;

    @Value("${securetrack.mqtt.username}")
    private String mqttUsername;

    @Value("${securetrack.mqtt.password}")
    private String mqttPassword;

    @Value("${securetrack.mqtt.topic.telemetry}")
    private String telemetryTopic;

    @Value("${securetrack.mqtt.qos:1}")
    private int qos;

    @Value("${securetrack.mqtt.auto-reconnect:true}")
    private boolean autoReconnect;

    private MqttAsyncClient client;

    @PostConstruct
    public void connect() {
        try {
            client = new MqttAsyncClient(brokerUrl, clientId, new MemoryPersistence());
            client.setCallback(this);

            MqttConnectionOptions options = new MqttConnectionOptions();
            options.setCleanStart(true);
            options.setAutomaticReconnect(autoReconnect);
            if (mqttUsername != null && !mqttUsername.isBlank()) {
                options.setUserName(mqttUsername);
                options.setPassword(mqttPassword.getBytes(StandardCharsets.UTF_8));
            }

            client.connect(options).waitForCompletion();
            client.subscribe(telemetryTopic, qos).waitForCompletion();
            log.info("Connected to MQTT 5.0 broker at {} and subscribed to '{}'", brokerUrl, telemetryTopic);
        } catch (MqttException e) {
            log.error("Failed to connect/subscribe to MQTT broker at {}: {}", brokerUrl, e.getMessage());
        }
    }

    @PreDestroy
    public void disconnect() {
        try {
            if (client != null && client.isConnected()) {
                client.disconnect();
            }
        } catch (MqttException e) {
            log.warn("Error disconnecting MQTT client: {}", e.getMessage());
        }
    }

    @Override
    public void messageArrived(String topic, MqttMessage message) {
        try {
            String json = new String(message.getPayload(), StandardCharsets.UTF_8);
            TelemetryPayload payload = objectMapper.readValue(json, TelemetryPayload.class);
            processTelemetry(payload);
        } catch (Exception e) {
            log.error("Failed to process telemetry message on topic {}: {}", topic, e.getMessage());
        }
    }

    /** Core processing pipeline for a single normalized telemetry reading. */
    public void processTelemetry(TelemetryPayload payload) {
        if (payload.getDeviceUid() == null) {
            log.warn("Telemetry payload missing deviceUid - ignoring: {}", payload);
            return;
        }

        Optional<IoTModule> moduleOpt = ioTModuleRepository.findByDeviceUid(payload.getDeviceUid());
        if (moduleOpt.isEmpty()) {
            log.warn("Received telemetry for unknown IoT device '{}'", payload.getDeviceUid());
            return;
        }
        IoTModule module = moduleOpt.get();

        // Update module state
        module.setBatteryLevel(payload.getBatteryLevel());
        module.setLightSensorActive(payload.getLightSensorActive());
        module.setMagnetSensorActive(payload.getMagnetSensorActive());
        module.setLastSeen(LocalDateTime.now());
        ioTModuleRepository.save(module);

        Optional<Container> containerOpt = containerRepository.findByIotModule_ModuleId(module.getModuleId());
        if (containerOpt.isEmpty()) {
            log.debug("IoT module {} is not yet linked to a Container - telemetry stored on module only", module.getDeviceUid());
            return;
        }
        Container container = containerOpt.get();

        // Append tracking checkpoint
        if (payload.getLatitude() != null && payload.getLongitude() != null) {
            TrackingLog checkpoint = TrackingLog.builder()
                    .container(container)
                    .gpsLocation(payload.getLatitude() + "," + payload.getLongitude())
                    .build();
            trackingLogRepository.save(checkpoint);
        }

        // Dual-sensor tamper verification
        securityMonitoringService.evaluateTamper(container, module, payload);

        // Cross-reference GPS against assigned geofence corridor
        routeVerificationService.verifyRoute(container, payload);
    }

    @Override
    public void disconnected(MqttDisconnectResponse disconnectResponse) {
        log.warn("MQTT client disconnected: {}", disconnectResponse.getReasonString());
    }

    @Override
    public void mqttErrorOccurred(MqttException exception) {
        log.error("MQTT protocol error: {}", exception.getMessage());
    }

    @Override
    public void deliveryComplete(IMqttToken token) {
        // Not used - this service only subscribes, it does not publish.
    }

    @Override
    public void connectComplete(boolean reconnect, String serverURI) {
        log.info("MQTT connectComplete (reconnect={}) to {}", reconnect, serverURI);
    }

    @Override
    public void authPacketArrived(int reasonCode, MqttProperties properties) {
        // Enhanced MQTT 5.0 auth flow - not required for the default broker configuration.
    }
}
