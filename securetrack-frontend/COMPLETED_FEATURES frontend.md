# SecureTrack SL: Completed Features Report

**Report date:** 2026-09-12  
**Workspace:** `securetrack-frontend`  
**Scope:** React frontend source, package manifest, and generated frontend build artifacts available in this workspace.

## Scope and Verification Status

This workspace contains the SecureTrack SL React frontend only. No Spring Boot, Java, Kotlin, Maven, Gradle, controller, service, repository, entity, migration, or `SecurityConfig` files are present. Consequently:

- Frontend behavior and API integration contracts below are verified from source.
- Backend persistence, Spring Security configuration, role enforcement, geofence calculations, alert generation, and database history are **not verifiable from this checkout**.
- An API call in the frontend proves that the UI expects a capability; it does not prove that the backend endpoint is implemented, secure, or backed by persistent data.

## 1. Authentication & Security

### Implemented in the frontend

- Username/password sign-in through `POST /auth/login`.
- JWT and returned role are stored in browser `localStorage`.
- The protected `/app` route is guarded by `RequireAuth`, which checks for a stored token before rendering the application shell.
- Axios attaches the stored token to requests as:

  ```http
  Authorization: Bearer <token>
  ```

- Axios handles 401/403 responses by clearing the token and redirecting to `/`, except requests explicitly sent with `skipAuthRedirect: true`.
- Owner vehicle tracking uses that exception to handle authorization errors locally and display a user-friendly message.
- Login distinguishes invalid credentials, unavailable server, and general request failures.
- Logout removes the stored token and returns to the sign-in page.
- The sidebar filters navigation entries by the role stored in `localStorage` or decoded from the JWT.

### Roles represented by the frontend

| Role | Frontend access represented |
|---|---|
| `ADMIN` | Dashboard, alerts, Admin Panel, reports, and settings. |
| `CUSTOM_OFFICER` | Dashboard, alerts, reports, and settings. |
| `DRIVER` | Driver Dashboard and settings. |
| `OWNER` | Dashboard and alerts. The owner dashboard tracks a vehicle's active trip. |
| `INSPECTOR` | Settings and account creation option only; no dedicated inspector workflow is implemented. |

### Not verifiable

The following require the backend source or a verified running API:

- Spring Security filter-chain configuration.
- `@PreAuthorize`/role annotations and server-side authorization.
- JWT signing, expiry, refresh tokens, password hashing, and authentication providers.
- Session invalidation beyond the frontend token removal.
- Database-level user roles and permission enforcement.

## 2. Dashboards & UIs

### Shared application shell

- React Router provides the public sign-in page and protected `/app` routes.
- `SidebarLayout` provides:
  - Role-aware navigation.
  - User name and role display from JWT/local storage.
  - Logout action.
  - SecureTrack branding and live-tracking header state.
- Current routes include:
  - `/app/dashboard`
  - `/app/alerts`
  - `/app/admin`
  - `/app/reports`
  - `/app/settings`
  - `/app/driver`

### Admin and Customs Officer dashboard

The shared `Dashboard` and `LiveMap` components provide:

- Global live container monitoring for `ADMIN` and `CUSTOM_OFFICER` roles.
- Active-container count, global-alert count, and monitored-route count cards.
- Live location polling from `GET /api/monitoring/live-locations`.
- Planned route retrieval for active containers.
- Active trip status polling from `GET /api/trips`.
- Removal of completed trips from active map markers, planned route overlays, traveled paths, and active counts.
- Route assignment through `AssignRouteModal`.

### Driver Dashboard

`DriverDashboard.jsx` provides:

- Vehicle number search with uppercase normalization.
- Active trip lookup through `GET /api/trips/vehicle/{vehicleNumber}/active`.
- Planned route display and map fitting.
- Trip status panel.
- `Start Trip` and `End Trip` actions through `PUT /api/trips/{tripId}/status`.
- Local status updates and success feedback after status changes.
- A prominent Report Issue/Emergency action.
- Modal text entry and incident submission through `POST /api/alerts/driver-report`.
- Automatic restoration of the last searched vehicle from `localStorage`.
- Active-trip location polling every five seconds.
- Red actual-path rendering and start/current markers.

### Owner dashboard

The owner workflow is implemented in `Dashboard.jsx`; there is no separate `OwnerDashboard.jsx` in this checkout.

- Vehicle search UI with `Enter Vehicle Number` and `Track Vehicle`.
- Active vehicle trip lookup.
- Uppercase vehicle normalization before the request.
- Owner vehicle persistence using `ownerVehicleNumber` in `localStorage`.
- Automatic trip restoration when the dashboard mounts.
- Trip status, vehicle, and route summary cards.
- Live actual-path polling every five seconds for active trips.
- Trip-specific alert retrieval and display.
- User-friendly handling for missing trips and 401/403 authorization failures.

### Inspector status

- `INSPECTOR` is available as an account type and role value.
- Settings access is available for the role.
- No inspector dashboard, inspection queue, inspection form, evidence capture, approval workflow, or inspection history is implemented in the frontend.

## 3. Live Tracking & Mapping

### Map technology

- React Leaflet and Leaflet are installed and used by both shared and role-specific map views.
- Google map tile URLs are used for standard and satellite layers.
- The shared map is centered and bounded to Sri Lanka.
- Leaflet marker assets are configured explicitly to avoid missing default marker icons.

### Planned versus actual routes

- Planned route geometry is parsed from supported trip fields such as `routeCoordinatesJson`, `routeJson`, `routeGeometry`, and `geometry`.
- OSRM/GeoJSON longitude-latitude coordinates are converted to Leaflet latitude-longitude pairs.
- Planned routes are rendered in blue:

  ```jsx
  <Polyline
    positions={plannedRoute}
    pathOptions={{ color: '#2563eb', weight: 5 }}
  />
  ```

- Actual tracking paths are normalized from backend location objects containing latitude/longitude or lat/lng fields.
- Actual paths are rendered in red:

  ```jsx
  <Polyline
    positions={actualPath}
    pathOptions={{ color: 'red', weight: 5 }}
  />
  ```

### Polling behavior

| View | Data | Interval |
|---|---|---:|
| Driver Dashboard | `GET /api/monitoring/trip/{tripId}/locations` | 5 seconds while the trip is `ACTIVE` |
| Owner Dashboard | `GET /api/monitoring/trip/{tripId}/locations` | 5 seconds while the trip is `ACTIVE` |
| Admin/Customs LiveMap | `GET /api/monitoring/live-locations` and `GET /api/trips` | 10 seconds |
| Admin/Customs actual history | `GET /api/monitoring/trip/{tripId}/locations` for every active trip | During the 10-second map refresh |

All implemented polling effects clean up their intervals when the component unmounts or the tracked trip/status changes.

### Dynamic markers

- Live container markers show container ID, status, speed, and device ID.
- Driver actual-path markers show:
  - The first coordinate as `Start Location`, using a custom green Leaflet icon.
  - The last coordinate as `Current Location`, using the default marker icon.
- Owner/shared map shows the latest actual coordinate as `Current Location`.
- Tracked markers animate and pan the map toward updated live coordinates.
- Route bounds are fitted when planned or actual coordinates become available.

### Frontend diagnostic logging

The Driver and Admin actual-history requests log:

```js
console.log('Fetched Map Data:', response.data);
```

This makes it possible to distinguish an empty backend response from a frontend coordinate parsing problem.

## 4. Geofencing & Alerts Management

### Geofence UI implemented

The Admin Panel includes a Geofence Zones tab with:

- Geofence list loading from `GET /api/geofences`.
- Geofence creation through `POST /api/geofences`.
- Geofence deletion through `DELETE /api/geofences/{id}`.
- Configurable fields for:
  - Zone name.
  - Latitude and longitude.
  - Radius in meters.
  - Start and end points.
  - Container number.
  - IoT module ID.
  - Signal strength.
- Geofence cards showing location, radius, endpoints, container, and IoT metadata.

### Alert UI implemented

The Alerts page includes:

- Global alert retrieval from `GET /api/alerts`.
- Newest-first alert sorting.
- Priority filters: All, High, Medium.
- Status filters: All, Active, Investigating, Resolved.
- Severity/status presentation and alert summary cards.
- Container, GPS-location, and timestamp display.
- Customs Officer actions:
  - Investigate via `PUT /api/alerts/{alertId}/acknowledge`.
  - Dismiss/resolve via `PUT /api/alerts/{alertId}/resolve`.
- Owner vehicle alert display using trip-specific alert retrieval in the dashboard.
- Driver emergency/issue reports through `POST /api/alerts/driver-report`.

### Map alert visualization

- Route overlays use a red security-buffer visualization around planned routes in `LiveMap`.
- Actual traveled paths use red polylines.
- Alert status and severity are visible in the Alerts UI.

### Not verifiable or not present

- No `leaflet-draw` dependency or polygon drawing/editing workflow is present in `package.json` or source.
- The Admin geofence UI is a coordinate/radius form, not a Leaflet Draw polygon editor.
- Backend logic for route-deviation detection, geofence entry/exit evaluation, automatic alert generation, escalation, and persistence is not available in this workspace.
- Notification delivery through email, SMS, or push is not verifiable.

## 5. System Management & Inspector Tasks

### User management implemented

The Admin Panel supports:

- Loading staff, driver, and owner accounts from:
  - `GET /api/admin/users/staff`
  - `GET /api/admin/users/drivers`
  - `GET /api/admin/users/owners`
- User search by name, email, and role.
- Creating users through `POST /api/admin/users`.
- Supported account types in the form:
  - Admin.
  - Customs Officer.
  - Field Inspector.
  - Truck Driver.
  - Cargo Owner.
- Driver-only vehicle number field during account creation.
- Deleting users through `DELETE /api/users/{id}`.
- Role badges and role-specific styling in the user table.

There is no edit-user workflow in the current Admin Panel; creation and deletion are implemented.

### Route assignment and device metadata

`AssignRouteModal` supports:

- Container ID.
- Vehicle Number.
- IoT Module ID.
- Security buffer/deviation distance.
- Start and end coordinates.
- Start and end location names.
- Required form validation.
- Route assignment via `POST /api/trips/assign`.
- Full form reset after successful assignment.

The IoT Module ID field represents device pairing metadata in the frontend contract. A separate device provisioning, pairing lifecycle, health, battery, signal, replacement, or unpair workflow is not implemented.

### Inspector tasks

No dedicated inspector task interface is present. Inspection queue management, container/seal inspection, evidence upload, signatures, approval, and inspection history remain unimplemented or unverified.

## 6. Reports & History

### Reports dashboard implemented

`Reports.jsx` retrieves report data from `GET /api/reports/summary` and displays:

- Statistic cards with values and trends.
- Shipment activity chart.
- Completed shipment series where supplied by the API.
- Alert distribution pie chart.
- Report type selection:
  - Shipment Summary.
  - Alert Summary.
  - Officer Activity.
- Date-range selection:
  - Last Week.
  - Last Month.
  - Last 6 Months.
  - Custom range.
  - All Time.

### Export formats implemented

The browser can generate:

- PDF reports with title, report type, date range, summary cards, chart-style drawings, and tabular data.
- CSV downloads.
- Excel `.xlsx` downloads using the `xlsx` package.

### History status

- The frontend consumes summary/activity data from `/api/reports/summary`.
- The frontend does not currently fetch a dedicated completed-trip history endpoint such as `/api/trips/completed`.
- The selected date range is currently used in export labels; it is not sent as query parameters to the summary endpoint.
- Officer Activity export rows are currently hardcoded sample rows.
- Backend completed-trip persistence, history queries, filtering, and report aggregation cannot be verified without the backend source.

## Frontend API Integration Contract

The following endpoints are referenced by the current frontend:

| Method | Endpoint | Usage |
|---|---|---|
| `POST` | `/auth/login` | Sign in and obtain JWT/role. |
| `GET` | `/api/trips` | Admin trip status polling. |
| `GET` | `/api/trips/vehicle/{vehicleNumber}/active` | Driver/owner active vehicle trip lookup. |
| `GET` | `/api/trips/container/{containerId}` | Admin planned route lookup. |
| `POST` | `/api/trips/assign` | Assign trip/route and device metadata. |
| `PUT` | `/api/trips/{tripId}/status` | Start or complete a trip. |
| `GET` | `/api/monitoring/live-locations` | Admin/Customs live locations. |
| `GET` | `/api/monitoring/trip/{tripId}/locations` | Driver/owner/admin actual location history. |
| `GET` | `/api/alerts` | Global alerts. |
| `GET` | `/api/alerts/trip/{tripId}` | Owner trip alerts. |
| `GET` | `/api/alerts/container/{containerId}` | Existing container-alert contract. |
| `POST` | `/api/alerts/driver-report` | Driver issue/emergency report. |
| `PUT` | `/api/alerts/{alertId}/acknowledge` | Investigate an alert. |
| `PUT` | `/api/alerts/{alertId}/resolve` | Resolve/dismiss an alert. |
| `GET` | `/api/admin/users/staff` | Load staff users. |
| `GET` | `/api/admin/users/drivers` | Load drivers. |
| `GET` | `/api/admin/users/owners` | Load owners. |
| `POST` | `/api/admin/users` | Create users. |
| `DELETE` | `/api/users/{id}` | Delete users. |
| `GET` | `/api/geofences` | Load geofences. |
| `POST` | `/api/geofences` | Create geofences. |
| `DELETE` | `/api/geofences/{id}` | Delete geofences. |
| `GET` | `/api/admin/audit-logs` | Load audit logs. |
| `GET` | `/api/reports/summary` | Load report summary data. |
| `GET` | `/api/users/me` | Load current user settings. |
| `PUT` | `/api/users/me` | Save profile/preferences. |
| `POST` | `/api/users/me/password` | Change password. |

## Technology and Project Structure

- React 19 and React Router DOM.
- Axios with a shared base URL of `http://localhost:8080`.
- React Leaflet and Leaflet.
- Tailwind CSS/PostCSS.
- Recharts for analytics.
- jsPDF and jspdf-autotable for PDF exports.
- xlsx for Excel exports.
- lucide-react for interface icons.
- Browser `localStorage` for JWT, role, owner vehicle persistence, preferences, and profile image data.
- Main source areas:
  - `src/App.js`: routes and authentication shell.
  - `src/api.js`: Axios client/interceptors.
  - `src/components/SidebarLayout.jsx`: navigation and shell.
  - `src/components/LiveMap.jsx`: shared Admin/Customs and owner map integration.
  - `src/components/AssignRouteModal.jsx`: route assignment.
  - `src/pages/Dashboard.jsx`: Admin/Customs and owner dashboard behavior.
  - `src/pages/DriverDashboard.jsx`: driver trip workflow.
  - `src/pages/AdminPanel.jsx`: users, geofences, and audit logs.
  - `src/pages/Alerts.jsx`: alert lifecycle UI.
  - `src/pages/Reports.jsx`: analytics and exports.
  - `src/pages/Settings.jsx`: profile, notifications, security, and preferences.

## Overall Completion Summary

### Confirmed implemented in this frontend

- JWT login and protected application shell.
- Role-aware frontend navigation for Admin, Customs Officer, Driver, Owner, and Inspector representations.
- Admin/Customs live monitoring map.
- Vehicle-based Owner and Driver trip lookup.
- Planned route and actual path rendering.
- Live location polling with cleanup.
- Dynamic current/start markers.
- Trip start and completion controls.
- Driver issue/emergency reporting.
- Alert listing, filtering, investigation, and resolution UI.
- Owner trip alert display.
- Route assignment with vehicle and IoT module fields.
- User creation/deletion and geofence CRUD screens.
- Audit log display.
- Report charts and PDF/CSV/Excel export.
- User profile, notification, security, and preference settings.

### Requires backend source or server verification

- Spring Security configuration and server-side RBAC.
- JWT issuance, validation, expiry, refresh, and password security.
- Database entities, relationships, migrations, and trip/location persistence.
- Correct association of telemetry records with active trips.
- Route-deviation/geofence evaluation and automatic alert generation.
- Completed-trip history queries and report aggregation.
- Device pairing/provisioning and IoT lifecycle.
- Inspector workflows and inspection persistence.
- Email/SMS/push notification delivery.

## Evidence Index

- Authentication and routing: `src/App.js`, `src/pages/SignIn.jsx`, `src/api.js`.
- Role navigation: `src/components/SidebarLayout.jsx`.
- Shared map and live tracking: `src/components/LiveMap.jsx`.
- Owner/Admin dashboard: `src/pages/Dashboard.jsx`.
- Driver workflow: `src/pages/DriverDashboard.jsx`.
- Route assignment: `src/components/AssignRouteModal.jsx`.
- Alerts: `src/pages/Alerts.jsx`.
- Administration: `src/pages/AdminPanel.jsx`.
- Reports and export: `src/pages/Reports.jsx`.
- Account settings: `src/pages/Settings.jsx`, `src/userPreferences.js`.
- Dependencies and scripts: `package.json`.
