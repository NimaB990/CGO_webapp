package com.securetrack.backend.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.securetrack.backend.security.CustomUserDetailsService;
import com.securetrack.backend.security.JwtAuthenticationFilter;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                
                .requestMatchers(HttpMethod.GET, "/api/trips/driver/active").hasRole("DRIVER")
                .requestMatchers(HttpMethod.GET, "/api/trips/active")
                    .hasAnyRole("ADMIN", "DRIVER", "OWNER", "CUSTOM_OFFICER", "INSPECTOR")
                .requestMatchers(HttpMethod.GET, "/api/trips/debug/vehicles")
                    .hasAnyRole("ADMIN", "CUSTOM_OFFICER")
                .requestMatchers(HttpMethod.GET, "/api/trips/vehicle/*/active")
                    .hasAnyRole("DRIVER", "ADMIN", "OWNER", "CUSTOM_OFFICER")
                .requestMatchers(HttpMethod.PUT, "/api/trips/*/status").hasRole("DRIVER")
                .requestMatchers(HttpMethod.POST, "/api/alerts/driver-report").hasRole("DRIVER")

                // Assign Routes සඳහා අවසරය
                .requestMatchers("/api/trips/**").permitAll()
                
                // අලුතින් එකතු කළ පේළිය (IoT Live Tracking දත්ත සඳහා Token නැතුව අවසර දීම)
                .requestMatchers(HttpMethod.GET, "/api/monitoring/vehicle/**")
                    .hasAnyRole("ADMIN", "DRIVER", "OWNER", "CUSTOM_OFFICER", "INSPECTOR")
                .requestMatchers(HttpMethod.GET, "/api/monitoring/trip/**")
                    .hasAnyRole("ADMIN", "DRIVER", "OWNER", "CUSTOM_OFFICER", "INSPECTOR")
                .requestMatchers(HttpMethod.GET, "/api/monitoring/live-locations")
                    .hasAnyRole("ADMIN", "DRIVER", "OWNER", "CUSTOM_OFFICER", "INSPECTOR")
                .requestMatchers("/api/monitoring/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/dashboard/track/**").permitAll()

                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                .requestMatchers(HttpMethod.POST, "/api/geofences/**").hasAnyRole("ADMIN", "INSPECTOR")
                .requestMatchers(HttpMethod.PUT, "/api/geofences/**").hasAnyRole("ADMIN", "INSPECTOR")
                .requestMatchers(HttpMethod.DELETE, "/api/geofences/**").hasRole("ADMIN")

                .requestMatchers(HttpMethod.POST, "/api/containers/initialize").hasAnyRole("ADMIN", "CUSTOM_OFFICER")

                .requestMatchers(HttpMethod.POST, "/api/containers/*/complete").hasAnyRole("ADMIN", "CUSTOM_OFFICER", "INSPECTOR")

                .requestMatchers(HttpMethod.GET, "/api/alerts/**")
                    .hasAnyRole("ADMIN", "DRIVER", "CUSTOM_OFFICER", "INSPECTOR", "OWNER")
                .requestMatchers(HttpMethod.PUT, "/api/alerts/**")
                    .hasAnyRole("ADMIN", "CUSTOM_OFFICER", "INSPECTOR")

                .requestMatchers(HttpMethod.GET, "/api/containers/**").authenticated()

                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}