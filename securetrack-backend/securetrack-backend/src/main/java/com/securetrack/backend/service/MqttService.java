package com.securetrack.backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;

public class MqttService {

    private final String BROKER_URL = "tcp://broker.hivemq.com:1883";
    private final String CLIENT_ID = "SecureTrackBackend_" + System.currentTimeMillis();
    private final String TOPIC = "securetrack/live/location";

    private final Map<String, Map<String, Object>> activeLocations = new ConcurrentHashMap<>();

    @PostConstruct
    public void initMqtt() {
        try {
            MqttClient client = new MqttClient(BROKER_URL, CLIENT_ID);
            MqttConnectOptions options = new MqttConnectOptions();
            options.setAutomaticReconnect(true);
            options.setCleanSession(true);
            options.setConnectionTimeout(10);

            client.setCallback(new MqttCallback() {
                @Override
                public void connectionLost(Throwable cause) {
                    System.out.println("MQTT Connection lost: " + cause.getMessage());
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) throws Exception {

                    String payload = new String(message.getPayload());
                    System.out.println("Live Data Received: " + payload);

                    ObjectMapper mapper = new ObjectMapper();
                    Map<String, Object> data = mapper.readValue(payload, Map.class);

                    if (data.containsKey("containerId")) {
                        activeLocations.put(data.get("containerId").toString(), data);
                    }
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) {
                }
            });

            client.connect(options);
            client.subscribe(TOPIC);
            System.out.println("Connected to EMQX Broker and subscribed to: " + TOPIC);

        } catch (MqttException e) {
            e.printStackTrace();
        }
    }

    public List<Map<String, Object>> getActiveLocations() {
        return new ArrayList<>(activeLocations.values());
    }
}