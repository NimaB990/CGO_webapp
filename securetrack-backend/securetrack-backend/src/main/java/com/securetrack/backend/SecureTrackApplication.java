package com.securetrack.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class SecureTrackApplication {

    public static void main(String[] args) {
        SpringApplication.run(SecureTrackApplication.class, args);
    }
}
