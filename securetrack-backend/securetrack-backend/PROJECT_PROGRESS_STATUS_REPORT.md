# SecureTrack SL: Project Progress & Status Report

**Review date:** 2026-09-09  
**Reviewed scope:** `securetrack-backend` repository currently open in the workspace  
**Overall status:** Backend MVP is substantially implemented; frontend status cannot be verified from this repository.

## Scope and Evidence

The opened workspace contains a Spring Boot backend, Maven configuration, Java source, and resources. It does **not** contain a React application, `package.json`, a frontend source tree, JSX/TSX files, Axios setup, Google Maps code, or frontend build configuration. Therefore, frontend claims below are marked as **not verifiable from the available codebase**, rather than assumed to be complete.

The report is based on executable controller mappings, Spring Security configuration, services, repositories, entities, and application configuration. Comments and README claims are treated as planned/intended behavior unless the corresponding runtime code is enabled.

## 1. Completed Backend Features

### 1.1 Authentication and security

- JWT-based stateless authentication using Spring Security and JJWT.
- Password hashing with `BCryptPasswordEncoder` when accounts are created through `UserManagementService`.
- Unified login lookup across `Staff`, `Driver`, and `Owner` tables.
- Role authorities are emitted as `ROLE_ADMIN`, `ROLE_CUSTOM_OFFICER`, `ROLE_INSPECTOR`, `ROLE_DRIVER`, or `ROLE_OWNER`.
- Disabled accounts are rejected through `UserDetails.isEnabled()`.
- CORS, session policy, JWT filter registration, and method security are configured.
- Login audit entries are recorded for staff accounts.

### 1.2 Live REST API endpoints

| Area | Endpoint | Implemented behavior | Access in current configuration |
|---|---|---|---|
| Auth | `POST /auth/login` | Authenticates a user and returns a JWT, user ID, username, role, and user type | Public |
| Auth | `POST /auth/setup-admin` | Creates an account through the general user-creation service | Public |
| Admin | `POST /api/admin/users` | Creates `ADMIN`, `CUSTOM_OFFICER`, `INSPECTOR`, `DRIVER`, or `OWNER` accounts | `ADMIN` |
| Admin | `GET /api/admin/users/staff` | Lists staff accounts | `ADMIN` |
| Admin | `GET /api/admin/users/drivers` | Lists driver accounts | `ADMIN` |
| Admin | `GET /api/admin/users/owners` | Lists owner accounts | `ADMIN` |
| Admin | `PUT /api/admin/users/staff/{staffId}/deactivate` | Deactivates a staff account | `ADMIN` |
| Admin | `DELETE /api/admin/users/staff/{staffId}` | Deletes a staff account | `ADMIN` |
| Admin | `GET /api/admin/audit-logs` | Reads audit logs | `ADMIN` |
| Users | `GET /api/users/me` | Reads the authenticated staff profile and notification/preferences fields | Authenticated, but implementation resolves `Staff` only |
| Users | `PUT /api/users/me` | Updates staff profile and preference fields | Authenticated, but implementation resolves `Staff` only |
| Users | `POST /api/users/me/password` | Attempts to change a staff password | Authenticated, but password handling is currently unsafe/broken; see pending work |
| Containers | `POST /api/containers/initialize` | Creates a tracked container, links an IoT module, optionally links owner/driver/geofence, and seeds a tracking log | `ADMIN`, `CUSTOM_OFFICER` |
| Containers | `POST /api/containers/{containerId}/complete` | Marks a shipment completed, records completion time, closes the latest tracking log, and audits the action | `ADMIN`, `CUSTOM_OFFICER`, `INSPECTOR` |
| Containers | `GET /api/containers` | Lists containers; owner results are restricted to owned containers | Authenticated |
| Containers | `GET /api/containers/{containerId}` | Reads a container; owner access is ownership-scoped | Authenticated |
| Containers | `GET /api/containers/{containerId}/route` | Returns tracking logs for a container after ownership validation | Authenticated |
| Trips | `POST /api/trips/assign` | Creates a planned trip, stores/fetches an OSRM route, links an IoT module, and creates or updates a destination geofence | Currently public because `/api/trips/**` is `permitAll` |
| Trips | `GET /api/trips/container/{containerId}` | Returns the latest trip; owner queries are ownership-scoped | Currently public because `/api/trips/**` is `permitAll` |
| Tracking | `GET /api/dashboard/track/{containerId}` | Returns active trip, GPS, vehicle, container, route endpoints, and status | Public |
| Monitoring | `POST /api/monitoring/update` | Stores in-memory live location and checks route JSON for deviation alerts | Public |
| Monitoring | `GET /api/monitoring/live-locations` | Returns current in-memory locations | Public |
| Alerts | `GET /api/alerts` | Lists alerts; owners receive alerts for their containers | `ADMIN`, `CUSTOM_OFFICER`, `INSPECTOR`, `OWNER` |
| Alerts | `GET /api/alerts/active` | Lists pending alerts, owner-scoped where applicable | `ADMIN`, `CUSTOM_OFFICER`, `INSPECTOR`, `OWNER` |
| Alerts | `GET /api/alerts/container/{containerId}` | Reads alerts generated during the container's active trip | Same alert roles |
| Alerts | `PUT /api/alerts/{alertId}/acknowledge` | Changes alert status to `ACKNOWLEDGED` | `ADMIN`, `CUSTOM_OFFICER`, `INSPECTOR` |
| Alerts | `PUT /api/alerts/{alertId}/resolve` | Changes alert status to `RESOLVED` | `ADMIN`, `CUSTOM_OFFICER`, `INSPECTOR` |
| Geofences | `GET /api/geofences` | Lists geofences | Authenticated |
| Geofences | `GET /api/geofences/{id}` | Reads a geofence | Authenticated |
| Geofences | `POST /api/geofences` | Creates a geofence | `ADMIN`, `INSPECTOR` |
| Geofences | `PUT /api/geofences/{id}` | Updates geofence fields | `ADMIN`, `INSPECTOR` |
| Geofences | `DELETE /api/geofences/{id}` | Deletes a geofence | `ADMIN` |
| Reports | `GET /api/reports/summary` | Returns container/alert counts, alert distribution, and dashboard chart data | Authenticated |

### 1.3 IoT and telemetry implementation

- MQTT 5 client configuration and subscription to `securetrack/container/+/telemetry` exist in `MqttTelemetryService`.
- Telemetry updates module battery, sensor states, GPS coordinates, and `lastSeen`.
- GPS telemetry creates `TrackingLog` checkpoints for linked containers.
- Dual-sensor tamper logic raises critical alerts when the magnetic seal is open and light is detected.
- Single seal-open readings raise a medium-severity advisory alert.
- Low battery readings at or below 15% raise low-severity alerts.
- Route-deviation verification uses a Haversine distance against the assigned geofence point and raises high-severity alerts.
- A separate `MonitoringController` supports in-memory live locations and route-JSON deviation checks.

**Important runtime distinction:** `IoTModuleController` contains registration and REST telemetry methods, but its `@RestController` and `@RequestMapping("/api/iot-modules")` annotations are commented out. Those four methods are therefore not registered as REST endpoints in the current application. IoT modules can still be consumed by MQTT if they already exist in the database.

### 1.4 Database entities and persistence

The implemented JPA entities are:

- `Staff` superclass with joined inheritance: `Admin`, `CustomOfficer`, and `Inspector`.
- `Driver` and `Owner` login/account entities.
- `Container`, including owner, driver, IoT module, geofence, status, and lifecycle timestamps.
- `IoTModule`, including device UID, battery, sensor state, GPS, and last-seen time.
- `Trip`, including tracking reference, endpoints, route JSON, status, and deviation tolerance.
- `TrackingLog`, including container checkpoints and start/end timestamps.
- `Geofence`, including destination, coordinates, route metadata, and IoT/container identifiers.
- `Alert`, with `AlertType`, `AlertSeverity`, and `AlertStatus` values.
- `AuditLog`, linked to staff where applicable.

Spring Data repositories are present for the entity types, with owner-scoped and active-trip queries used by the services/controllers.

### 1.5 Operational integrations

- MySQL persistence through Spring Data JPA/Hibernate.
- OSRM route lookup when a trip request does not provide route geometry.
- MQTT 5 telemetry subscription through Eclipse Paho.
- Actuator health endpoint is permitted at `/actuator/health`.
- Central exception types and a global exception handler are present.

## 2. Completed Frontend Features

### Verified in this repository

No React frontend is present in the opened workspace. Consequently, the following cannot be confirmed from source:

- Dashboard page or dashboard widgets.
- Google Maps tiles or map rendering.
- Admin panel screens.
- Owner, customs officer, inspector, or driver pages.
- Axios client configuration or request interceptors.
- JWT storage/refresh behavior in the browser.
- Conditional rendering based on roles.
- Alert tables, report charts, route playback, or live-location polling.

The backend response shapes suggest intended consumers for dashboard tracking, reports, alerts, profiles, and user management, but those are API contracts only and are not proof that corresponding UI exists.

## 3. Implemented Role Workflows

### `ADMIN`

- Logs in through JWT authentication.
- Creates all supported account types.
- Lists staff, drivers, and owners.
- Deactivates or deletes staff accounts.
- Reads audit logs.
- Initializes and completes container tracking.
- Reads all authenticated container, route, alert, geofence, and report data.
- Acknowledges and resolves alerts.
- Creates, updates, and deletes geofences.
- Can use public trip assignment, monitoring, and tracking endpoints, although those endpoints are not restricted to admins in the current configuration.

### `CUSTOM_OFFICER`

- Logs in through JWT authentication.
- Initializes container tracking and associates registered IoT hardware, owner, driver, and optional geofence.
- Completes shipments and closes the latest tracking log.
- Reads alerts and acknowledges or resolves them.
- Reads authenticated containers, routes, geofences, and reports.
- Does not have access to admin user management or geofence deletion.
- Can call trip assignment and monitoring endpoints without an access token because of the current `permitAll` rules.

### `OWNER`

- Logs in through JWT authentication.
- Reads only containers associated with the owner through container list/detail/route service checks.
- Reads the owner's latest trip for a container through the owner-scoped query.
- Reads only alerts associated with the owner's containers through owner-scoped alert queries.
- Cannot initialize or complete shipments, manage users, acknowledge/resolve alerts, or manage geofences.
- The public dashboard tracking endpoint does not perform owner authorization, so a caller can query an active container by ID without proving ownership.

## 4. Pending and Missing Components

### Product features not verifiable or not implemented

1. **React frontend:** The frontend project must be located or added before Dashboard, Map, Admin Panel, role navigation, Axios integration, and UI completion can be assessed.
2. **Driver workflow/UI:** There is a Driver entity and vehicle number, but no driver-specific controller, route acceptance/start/stop workflow, status update API, or verified Driver UI.
3. **Inspector workflow/UI:** Inspectors can manage geofences and close shipments/alerts, but there is no dedicated inspection, field verification, or IoT pairing workflow.
4. **IoT device onboarding:** Enable and secure the IoT REST controller, or provide an authenticated/admin device-registration flow. Current initialization assumes the module already exists.
5. **Real notification delivery:** `AlertNotificationService` only logs alerts. WebSocket/STOMP, push notifications, email, SMS, and user preference enforcement are not connected.
6. **Production geofencing:** Geofences are stored and checked, but the implementation compares GPS to a single geofence coordinate or route vertices rather than a robust corridor/polygon model. Enter/exit events, dwell rules, checkpoint progression, and duplicate-alert suppression are missing.
7. **Trip lifecycle:** Trip assignment creates `PLANNED` trips, but there is no explicit trip start, pause, resume, cancel, or completion endpoint, and container/trip status transitions are not consistently coordinated.
8. **Historical analytics:** The report endpoint contains hard-coded trend and activity values (`92%`, `4.5h`, and sample weekday values), so real time-based KPI aggregation is pending.
9. **Live-location durability:** `MonitoringController` stores live locations in an in-memory map, which is lost on restart and is not suitable for multi-instance deployment.
10. **Testing and delivery evidence:** No test source files are present in the repository listing. Controller, security, service, MQTT, and end-to-end workflow tests should be added.

### High-priority implementation risks to resolve

- **Password change fixed:** `UserController` now verifies the current password with `PasswordEncoder.matches()` and stores the replacement using `PasswordEncoder.encode()`. Add focused controller/service tests to prevent regression.
- **Public sensitive endpoints:** `/api/trips/**`, `/api/monitoring/**`, and dashboard tracking are explicitly public. Trip assignment and telemetry mutation should be authenticated and role/device-authorized; tracking should enforce ownership or a deliberate public tracking-token policy.
- **Public admin bootstrap:** `/auth/setup-admin` is public and accepts any account type. It should be disabled after initial provisioning or protected by a one-time setup mechanism.
- **Secrets in configuration:** Database credentials, MQTT credentials, and a JWT secret are committed in `application.properties`. Move them to environment variables or a secret manager and rotate exposed values.
- **Owner authorization gaps:** Alert acknowledgement/resolution and some direct lookup paths do not verify that the caller is allowed to act on the specific container/alert, even though list queries are owner-scoped.
- **Notification preference fields are only stored:** Email/SMS/system and two-factor settings are exposed on staff profiles but have no corresponding delivery or authentication workflow.

## Conclusion

The backend has a credible MVP foundation for authenticated users, container lifecycle management, route assignment, MQTT telemetry, sensor-based tamper detection, alerts, geofence CRUD, and basic reporting. The main uncertainty is the frontend: it is absent from the supplied workspace, so no React UI feature can be certified from this review. The next practical milestone is to bring the frontend into the review scope, secure the public mutation/bootstrap endpoints, enable a controlled IoT onboarding path, replace log-only notifications, and add automated workflow tests.