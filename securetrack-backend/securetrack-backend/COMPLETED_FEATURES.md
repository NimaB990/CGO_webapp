# SecureTrack SL - Completed Features Report

**Review date:** 2026-09-12  
**Repository reviewed:** `securetrack-backend`  
**Overall status:** Backend MVP features are implemented. The React frontend is not included in the current workspace, so frontend-specific features are documented as unverified unless supported by backend contracts or repository documentation.

## Scope and Verification

This report is based on the Java source under `src/main/java`, Spring configuration, JPA entities and repositories, service implementations, REST controllers, `pom.xml`, `README.md`, and the existing project progress report.

The current workspace does not contain a React source tree, `package.json`, JSX/TSX files, Axios configuration, Leaflet imports, or frontend build configuration. Therefore, the following frontend claims cannot be verified from this checkout:

- Admin, Driver, Owner, and Inspector page layouts.
- React-Leaflet map rendering and Leaflet Draw controls.
- Frontend polling intervals and browser JWT storage.
- PDF or Excel download buttons and client-side export libraries.
- Frontend role-based navigation and dashboard state updates.

## 1. Authentication & Security

### Implemented authentication

- `POST /auth/login` authenticates Staff, Driver, and Owner accounts through a unified authentication service.
- Login returns a signed JWT containing the username, database ID, role, user type, issue time, and expiration time.
- JWTs are validated by `JwtAuthenticationFilter` on subsequent API requests.
- The application uses stateless Spring Security sessions.
- Passwords are encoded with BCrypt through Spring Security's `PasswordEncoder`.
- Disabled accounts are rejected through the `UserDetails.isEnabled()` contract.
- CORS and CSRF settings are configured for the REST API.
- `/actuator/health` and `/auth/**` are configured as public endpoints.

### Implemented role model

The unified `UserPrincipal` emits Spring authorities in the `ROLE_<ROLE>` format:

- `ADMIN`
- `CUSTOM_OFFICER`
- `INSPECTOR`
- `DRIVER`
- `OWNER`

The Driver principal is explicitly created with the `DRIVER` role, and the resulting authority is `ROLE_DRIVER`. Owner accounts similarly produce `ROLE_OWNER`.

### Implemented RBAC coverage

- Admin APIs under `/api/admin/**` are restricted to `ADMIN`.
- Container initialization is restricted to `ADMIN` and `CUSTOM_OFFICER`.
- Shipment completion is restricted to `ADMIN`, `CUSTOM_OFFICER`, and `INSPECTOR`.
- Geofence writes are restricted to `ADMIN` and `INSPECTOR`; deletion is restricted to `ADMIN`.
- Alert reads allow `ADMIN`, `DRIVER`, `CUSTOM_OFFICER`, `INSPECTOR`, and `OWNER`.
- Alert acknowledgement and resolution allow administrative/customs/inspector roles.
- Driver trip status updates require `DRIVER`.
- Vehicle trip lookup allows `DRIVER`, `ADMIN`, `OWNER`, and `CUSTOM_OFFICER`.
- Monitoring location reads explicitly allow `ADMIN`, `DRIVER`, `OWNER`, `CUSTOM_OFFICER`, and `INSPECTOR`.
- Method-level `@PreAuthorize` annotations and filter-chain matchers are used together for important trip, monitoring, and alert routes.

## 2. Dashboards & UIs

### Backend dashboard data contracts implemented

The backend exposes data needed by dashboard clients:

- `GET /api/trips` returns trips.
- `GET /api/trips/active` returns `PLANNED` and `ACTIVE` trips.
- `GET /api/trips/driver/active` returns the authenticated driver's active assignment.
- `GET /api/trips/vehicle/{vehicleNumber}/active` finds an active/planned trip by vehicle number.
- `GET /api/monitoring/trip/{tripId}/locations` returns persisted trip coordinates ordered by timestamp.
- `GET /api/monitoring/vehicle/{vehicleNumber}/locations` resolves the current trip for a vehicle and returns its location history.
- `GET /api/monitoring/live-locations` returns the current in-memory telemetry snapshot.
- `GET /api/alerts` and `GET /api/alerts/active` provide alert dashboard data with Owner scoping.
- `GET /api/reports/summary` provides summary cards, alert distribution, and shipment activity data.
- `GET /api/users/me` provides staff profile and notification-preference fields.

### Role-oriented backend workflows

- **Admin:** user management, audit-log access, container oversight, alert management, geofence management, reports, and monitoring data.
- **Driver:** assigned-trip lookup, vehicle-based trip lookup, trip start/end status updates, live-location reads, and emergency alert reporting.
- **Owner:** owner-scoped container and alert access, vehicle/trip monitoring reads, and owner-visible dashboard data.
- **Inspector:** geofence management, shipment completion, alerts, monitoring, and report access according to the configured role rules.

### Frontend verification status

No Admin, Driver, Owner, or Inspector React components are present in this workspace. The backend API supports these workflows, but the corresponding UI implementation cannot be certified from the available repository.

## 3. Live Tracking & Mapping

### Persisted simulated location tracking

- `POST /api/monitoring/location` accepts a `tripId`, optional `containerId`, latitude, longitude, and timestamp.
- The endpoint validates that an optional `containerId` belongs to the supplied trip.
- The location is persisted as a `TripLocation` entity with a non-null `trip_id` relationship.
- `POST /api/monitoring/update` accepts container-based telemetry, resolves the newest `ACTIVE`, `IN_TRANSIT`, or `PLANNED` trip for that container, and persists the coordinate against that trip.
- If no active/planned trip exists, the container telemetry request returns an error instead of silently storing an unlinked point.
- ISO timestamps with local or offset formats are supported by the monitoring controller.

### Location history APIs

- `GET /api/monitoring/trip/{tripId}/locations` returns all coordinates for a trip ordered by `timestamp ASC`.
- `GET /api/monitoring/vehicle/{vehicleNumber}/locations` resolves the newest matching `PLANNED` or `ACTIVE` trip case-insensitively and returns its ordered coordinates.
- `TripLocation` exposes `latitude`, `longitude`, and `timestamp` for map clients.
- `TripLocationRepository` provides `findByTrip_IdOrderByTimestampAsc` for chronological route plotting.

### Planned and actual route data

- `Trip.routeCoordinatesJson` stores the route geometry returned from the client or OSRM.
- `TripAssignmentService` fetches an OSRM driving route when route geometry is not supplied.
- Trip assignment stores the planned route JSON and vehicle number before saving the trip.
- The backend supplies the planned route and actual recorded path needed for a blue planned polyline and red actual polyline.

### Frontend map verification status

The current checkout does not contain React-Leaflet components, so the following cannot be verified as implemented in source:

- `MapContainer` usage.
- Planned-route blue `Polyline` rendering.
- Actual-route red `Polyline` rendering.
- Start/current `Marker` rendering.
- Five-second location polling.
- Map panning to the latest location.

## 4. Geofencing & Alerts Management

### Geofence management

`GeofenceController` implements:

- `GET /api/geofences`
- `GET /api/geofences/{id}`
- `POST /api/geofences`
- `PUT /api/geofences/{id}`
- `DELETE /api/geofences/{id}`

Geofence records store destination, latitude, longitude, signal strength, start/end points, container number, and IoT identifier. Geofence creation and updates are restricted by the security configuration.

### Automatic geofence behavior

When a trip is assigned:

- The destination geofence is searched by destination name.
- A geofence is created if no matching destination exists.
- Existing destination geofences are updated with route/container/IoT metadata.
- Audit entries are written for automatic geofence creation and route assignment.

### Route-deviation detection

- `RouteVerificationService` compares incoming GPS positions against the assigned geofence corridor using a Haversine-distance calculation.
- The configured threshold is read from `securetrack.geofence.deviation-threshold`.
- Positions outside the configured tolerance create `ROUTE_DEVIATION` alerts with `HIGH` severity.
- The REST monitoring fallback also parses stored route JSON and checks the current position against route geometry.

### Tamper and telemetry alerts

`SecurityMonitoringService` implements dual-sensor tamper handling:

- A seal/magnet-open state combined with active light detection creates a critical tamper alert.
- A seal-open reading without light creates a lower-severity advisory alert.
- Low battery readings at or below the configured threshold create low-severity alerts.
- Alerts are persisted with container, message, GPS, type, severity, status, and timestamp data.

### Alert management API

- `GET /api/alerts` lists alerts, with Owner-specific container scoping.
- `GET /api/alerts/active` lists pending alerts.
- `GET /api/alerts/container/{containerId}` returns alerts associated with the active trip timeframe.
- `POST /api/alerts/driver-report` creates a `HIGH` severity `DRIVER_EMERGENCY` alert for a driver's trip.
- `PUT /api/alerts/{alertId}/acknowledge` changes an alert to `ACKNOWLEDGED`.
- `PUT /api/alerts/{alertId}/resolve` changes an alert to `RESOLVED`.
- `AlertNotificationService` is integrated into route/tamper alert creation; its current implementation logs notification activity rather than delivering an external push/email/SMS message.

### Frontend verification status

Leaflet Draw, geofence polygon editing, alert tables, dismiss/resolve controls, and dashboard visualizations are not present in the current workspace and therefore remain unverified from source.

## 5. System Management & Inspector Tasks

### User management

`AdminController` and `UserManagementService` support:

- Creating Staff roles, Drivers, and Owners.
- Listing all staff accounts.
- Listing drivers.
- Listing owners.
- Deactivating staff accounts.
- Deleting staff accounts.
- Validating usernames and email uniqueness.
- Requiring vehicle information for Driver account creation.
- Auditing user-management actions.

### Profile and account settings

`UserController` exposes:

- `GET /api/users/me`
- `PUT /api/users/me`
- `POST /api/users/me/password`

Profile fields include name, email, phone, language, timezone, email alerts, SMS alerts, system alerts, and two-factor preference fields. The implementation currently resolves Staff profiles; Driver/Owner-specific profile handling is not separately implemented.

### Container and device pairing

Container initialization supports pairing:

- Container ID/code.
- IoT module/device ID.
- Optional driver ID.
- Optional owner ID.
- Optional geofence ID.
- Container destination and route metadata.

`ShipmentService` resolves and links the selected Driver, Owner, IoT module, and geofence, then creates an initial tracking log. `IoTModule` stores device UID, GPS coordinates, battery, sensor states, and last-seen data.

### IoT ingestion

- MQTT 5 subscription is configured for `securetrack/container/+/telemetry`.
- `MqttTelemetryService` updates IoT module state and appends tracking checkpoints.
- A REST telemetry controller class exists, but its REST annotations are currently commented out, so those REST telemetry endpoints are not registered unless re-enabled.

### Inspector capabilities

Verified backend permissions allow Inspectors to:

- Create and update geofences.
- Complete shipments.
- Read and manage alerts according to configured alert permissions.
- Read monitoring and report data.

No dedicated Inspector UI or inspection checklist workflow is present in this repository.

## 6. Reports & History

### Implemented history and reporting APIs

- Container tracking history is persisted through `TrackingLog` records.
- `GET /api/containers/{containerId}/route` returns tracking-log checkpoints for a container after ownership checks.
- Trip location history is persisted in `TripLocation` and can be retrieved by trip ID or vehicle number.
- `GET /api/reports/summary` returns:
  - Total shipment/container count from the database.
  - Total alert count from the database.
  - Alert distribution grouped by alert type.
  - Shipment activity data for dashboard charts.
  - Summary cards for shipment and transit metrics.

### Reporting limitations

- Some report-card values, including on-time delivery and average transit time, are currently hard-coded rather than calculated from completed trip timestamps.
- Shipment activity includes fixed sample weekday values alongside one database-derived value.
- No PDF or Excel export controller, service, dependency, or frontend export implementation was found in the current workspace.
- Completed-trip history is not exposed through a dedicated completed-trip report endpoint; the available history is primarily container tracking-log data and trip persistence.

## Additional Implemented Infrastructure

- Spring Boot application bootstrap and Maven build configuration.
- MySQL connection configuration with Hibernate schema update mode.
- JPA repositories for users, containers, trips, locations, tracking logs, IoT modules, geofences, alerts, and audit logs.
- Central `ResourceNotFoundException`, `BadRequestException`, authentication handling, and global exception response mapping.
- Audit logging for login, assignment, geofence creation/update, container initialization, and shipment completion.
- Actuator health endpoint.
- CORS configuration for local frontend development.

## Verification Summary

| Area | Status | Evidence |
|---|---|---|
| JWT authentication | Implemented | `AuthController`, `AuthService`, `JwtUtil`, `JwtAuthenticationFilter` |
| RBAC | Implemented | `SecurityConfig`, `UserPrincipal`, `@PreAuthorize` annotations |
| Trip assignment | Implemented | `TripController`, `TripAssignmentService`, `TripRepository` |
| Trip status lifecycle | Implemented | `TripController`, `TripService`, persisted start/end timestamps |
| Simulated location persistence | Implemented | `MonitoringController`, `TripLocation`, `TripLocationRepository` |
| MQTT telemetry processing | Implemented | `MqttTelemetryService` |
| Route deviation alerts | Implemented | `RouteVerificationService`, `MonitoringController` |
| Geofence CRUD | Implemented | `GeofenceController` |
| Alert CRUD/status management | Implemented | `AlertController`, `AlertRepository` |
| User management | Implemented | `AdminController`, `UserManagementService` |
| Device/container pairing | Implemented | `ShipmentService`, `Container`, `IoTModule` |
| Summary reporting API | Partially implemented | `ReportController`; several metrics are static/sample values |
| React dashboards | Not verifiable | No frontend source in workspace |
| Leaflet/Leaflet Draw UI | Not verifiable | No frontend source in workspace |
| PDF/Excel exports | Not found | No export implementation/dependency found |

## Conclusion

SecureTrack SL has a substantial backend MVP covering authentication, role-based access, container and trip workflows, IoT/MQTT telemetry, persisted simulated locations, geofence checks, alerts, user administration, device pairing, audit logging, and summary reporting.

The main outstanding verification gap is the frontend: the current workspace contains no React application, so dashboard layouts, Leaflet rendering, polling, frontend role handling, and document exports cannot be certified here. The highest-value next steps are to include the frontend repository for validation, replace hard-coded report metrics with database aggregation, add PDF/Excel export support, secure public mutation/bootstrap endpoints, and add automated API/security workflow tests.
