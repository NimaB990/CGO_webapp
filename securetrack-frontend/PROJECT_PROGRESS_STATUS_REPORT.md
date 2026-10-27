 # SecureTrack SL: Project Progress & Status Report

**Assessment date:** 2026-09-09  
**Workspace assessed:** `securetrack-frontend`  
**Assessment scope:** React frontend source, package manifest, README, and generated build output visible in this workspace.

## Executive Summary

The workspace contains a functional React client for a container monitoring system. It includes JWT login, role-aware navigation, owner container tracking, customs live monitoring, route assignment, alert handling, administration screens, reporting/export, and account settings.

No Spring Boot, Java/Kotlin, Maven, or Gradle source is present in the assessed workspace. Therefore, backend implementation status, database entities, and Spring Security configuration cannot be confirmed from this checkout. The API list below is the frontend's implemented integration contract, not proof that every endpoint is implemented or secured on the server.

## 1. Completed Backend Features

### Backend source availability

**Status: Not assessable from this workspace.** No backend source files or build descriptors were found. In particular, the following cannot be verified:

- Functional Spring REST controller implementations.
- JPA/Hibernate entities, relationships, repositories, migrations, or database schema.
- JWT signing, token expiry, password hashing, refresh-token handling, or authentication providers.
- Spring Security route rules and server-side role enforcement.
- IoT ingestion, GPS persistence, alert generation, geofence evaluation, or notification workers.

### Frontend-observed API contract

The frontend is coded to call the following backend operations through Axios. These are the server capabilities expected by the UI; their actual server-side implementation must be verified against the backend repository or a running API.

| Method | Endpoint | Frontend use |
|---|---|---|
| `POST` | `/auth/login` | Authenticate and receive a JWT and role. |
| `GET` | `/api/alerts` | Load global/all alerts for dashboard and alerts page. |
| `GET` | `/api/dashboard/track/{containerNo}` | Retrieve live tracking data for an owner's container. |
| `GET` | `/api/alerts/container/{containerNo}` | Retrieve alerts for one container. |
| `POST` | `/api/trips/assign` | Assign a route, IoT module, and allowed deviation buffer. |
| `GET` | `/api/monitoring/live-locations` | Retrieve active container GPS/device data. |
| `GET` | `/api/trips/container/{id}` | Retrieve planned route geometry for a live container. |
| `PUT` | `/api/alerts/{alertId}/acknowledge` | Move an alert to acknowledged/investigating. |
| `PUT` | `/api/alerts/{alertId}/resolve` | Resolve/dismiss an alert. |
| `GET` | `/api/admin/users/staff` | Load staff accounts. |
| `GET` | `/api/admin/users/drivers` | Load driver accounts. |
| `GET` | `/api/admin/users/owners` | Load owner accounts. |
| `POST` | `/api/admin/users` | Create admin, customs officer, inspector, driver, or owner accounts. |
| `DELETE` | `/api/users/{id}` | Delete a user. |
| `GET` | `/api/geofences` | Load configured geofence zones. |
| `POST` | `/api/geofences` | Create a geofence. |
| `DELETE` | `/api/geofences/{id}` | Delete a geofence. |
| `GET` | `/api/admin/audit-logs` | Load audit/activity logs. |
| `GET` | `/api/reports/summary` | Load report cards, shipment activity, and alert distribution. |
| `GET` | `/api/users/me` | Load the current user's profile and preferences. |
| `PUT` | `/api/users/me` | Save profile, notification, security, language, and timezone settings. |
| `POST` | `/api/users/me/password` | Change the current password. |

### Entities implied by frontend payloads

The UI references the following domain concepts, but no backend entity definitions are available to confirm their schema:

- User/staff, driver, owner, customs officer, inspector, and admin accounts.
- Container and container identifier.
- Trip/route, route coordinates, start/end locations, and allowed deviation buffer.
- IoT module/device and live GPS location.
- Alert, severity, status, message, GPS location, and container association.
- Geofence zone with center, radius, start/end points, container, IoT module, and signal strength.
- Audit log.
- Report summary, shipment activity, and alert distribution.

## 2. Completed Frontend Features

### Authentication and application shell

- `SignIn` calls `/auth/login`, stores the returned JWT and role in `localStorage`, and routes to the dashboard.
- `RequireAuth` protects the `/app` shell when a token is absent.
- Axios automatically adds `Authorization: Bearer <token>` to requests.
- Axios clears the token and redirects to `/` for HTTP 401/403 responses.
- `SidebarLayout` provides the authenticated shell, sidebar navigation, user/role display, and logout.
- Role-filtered navigation is implemented for Dashboard, Alerts, Admin Panel, Reports, and Settings.

### Pages and components

- **Dashboard:** Owner container-ID tracking with 10-second polling, container status cards, global active-container/alert/route counts, live map, and route assignment for global roles.
- **LiveMap:** React Leaflet map centered on Sri Lanka, bounded to Sri Lanka, with standard and satellite Google tile layers, tracked marker animation, active container markers, speed/device details, planned route polylines, security-buffer visualization, and travelled paths.
- **AssignRouteModal:** Route assignment form containing container ID, IoT module ID, deviation buffer, start/end coordinates, and start/end names.
- **Alerts:** Alert list sorted by newest timestamp, priority/status filters, severity presentation, container/location/time details, and acknowledge/resolve actions.
- **AdminPanel:** User management, user search, user creation/deletion, geofence creation/deletion, geofence details, and audit log display.
- **Reports:** Statistic cards, shipment activity bar chart, alert distribution pie chart, report type/date-range controls, and PDF/CSV/Excel export.
- **Settings:** Profile, notification preferences, password/security, 2FA toggle, language, timezone, and local profile-image handling.
- **Shared utilities:** `userPreferences.js` applies language/timezone settings and formats user-facing dates.

### Integrations

- Axios for backend communication against hardcoded `http://localhost:8080`.
- React Router DOM for routing and protected application navigation.
- React Leaflet/Leaflet for maps and markers.
- Google map tile URLs for standard and satellite map layers.
- Recharts for analytics visualizations.
- `jsPDF` and `jspdf-autotable` for PDF reports.
- `xlsx` for Excel export and browser-generated CSV export.
- Tailwind CSS/PostCSS and `lucide-react` for styling and icons.
- Browser `localStorage` for JWT, role, profile image, language, and timezone preferences.

## 3. Implemented Role Workflows

The following describes the behavior currently implemented in the React client. It does not replace server-side authorization.

### `ADMIN`

- Can access Dashboard, Alerts, Admin Panel, Reports, and Settings through the sidebar.
- Can view global live container locations and global alert data.
- Can assign routes and security corridors from the Dashboard.
- Can access the Admin Panel's user management, geofence management, and audit log tabs.
- Can create/delete users and create/delete geofences through the exposed API calls.
- Can view report charts and export PDF, CSV, or Excel files.
- The UI does not expose the alert Investigate/Dismiss buttons to `ADMIN`; those controls are explicitly limited to `CUSTOM_OFFICER`.

### `CUSTOM_OFFICER`

- Can access Dashboard, Alerts, Reports, and Settings.
- Can monitor all active containers, planned routes, travelled paths, and global alerts.
- Can assign routes and security corridors.
- Can filter alerts and move unresolved alerts to Investigating (`ACKNOWLEDGED`) or Resolved (`RESOLVED`).
- Can view and export shipment, alert, and officer-activity reports.
- Cannot access the Admin Panel from the role-filtered navigation.

### `OWNER`

- Can access Dashboard and Alerts.
- Can enter a container ID and request live tracking data.
- Can see the tracked container's vehicle, route, status, marker, and associated alerts.
- Tracking data is polled every 10 seconds after a successful lookup.
- Cannot access global active-container monitoring, route assignment, reports, or the Admin Panel.
- The sidebar redirects an owner away from paths other than Dashboard and Alerts.
- The UI does not show alert investigation or dismissal actions to an owner.

### Other roles represented

`INSPECTOR` and `DRIVER` appear in the account-creation form and receive Settings navigation entries, but there is no dedicated inspector workflow, driver workflow, map view, trip screen, or field-operation page implemented in this frontend.

## 4. Pending/Missing Components

### Missing or unverified backend capabilities

These are not present in the assessed workspace and must be supplied or verified in the Spring Boot repository:

1. Spring REST controllers for the frontend contract.
2. Database entities, relationships, validation, migrations, and repository/service layers.
3. Server-side JWT validation, expiry handling, password hashing, and role-based authorization for every protected endpoint.
4. Persistent IoT/device registration and telemetry ingestion, including authentication of devices.
5. GPS history storage and reliable trip/route state transitions.
6. Automatic geofence and route-deviation detection that creates alerts.
7. Notification delivery workers for email, SMS, push, and in-system notifications.
8. Audit-log persistence and complete coverage of security-sensitive actions.
9. Backend report filtering by date range and report-type data generation.
10. Automated backend tests, API contract tests, and integration tests with the frontend.

### Missing product workflows

- **Driver UI:** Assigned-trip list, route start/stop, navigation, live location sharing, delivery milestones, incident reporting, and offline/retry behavior.
- **Field inspector UI:** Inspection queue, container/seal inspection forms, evidence/photo capture, signatures, and inspection status workflow.
- **IoT pairing and lifecycle:** Pair/unpair device, provisioning, device health, battery/signal monitoring, replacement, and tamper state.
- **Geofence operations:** Map-based zone drawing/editing, assignment rules, entry/exit history, and escalation configuration. The admin form exists, but automated enforcement is not visible in this frontend.
- **Container and shipment management:** Create/edit container records, manifests, cargo details, owner-to-container assignment, trip history, and status transitions.
- **Notifications:** Real email/SMS/push delivery, notification center, read/unread state, templates, retry/dead-letter handling, and user-level channel preferences.
- **Operational exception handling:** Broken seal/tamper workflow, prolonged stop, lost GPS, device offline, route deviation acknowledgement history, and escalation/SLA tracking.
- **Security and account lifecycle:** Forgot-password flow, account activation/deactivation, refresh tokens, session/device management, and working 2FA verification. The current sign-in link is only an anchor and the 2FA control is a preference toggle.
- **Authorization hardening:** Page-level guards for Admin Panel/Reports, consistent role naming, and backend enforcement. The client currently relies heavily on `localStorage.role` and navigation filtering.
- **Production configuration:** Environment-based API URL, HTTPS/CORS configuration, external tile/provider policy, secrets management, observability, and deployment configuration.

### Known frontend gaps and risks

- The Admin Panel has no internal role guard; direct navigation relies on the shell and backend authorization.
- `RequireAuth` checks token presence but does not validate expiry or claims locally.
- Logout removes `token` but leaves `role` in `localStorage`.
- `CUSTOM_OFFICER` is the active role value in most checks, while one fallback uses `CUSTOMS_OFFICER`, creating a possible mismatch.
- Report date-range selections affect the export label but are not sent to the summary API; Officer Activity rows are hardcoded sample data.
- “Resolved” summary counts all resolved alerts, not only alerts resolved today.
- Settings language changes locale/preferences, but the visible interface remains English.
- Profile images are stored as base64 data in browser storage rather than uploaded to the server.
- Several failed data loads only log to the console or show browser alerts.
- The default Create React App test is stale: it looks for the original “learn react” link, which is not part of this application.

## Recommended Next Steps

1. Add the Spring Boot repository to the workspace, or provide its repository path, so backend controllers, entities, database schema, and security rules can be verified.
2. Define and test one canonical role vocabulary, especially `CUSTOM_OFFICER` versus `CUSTOMS_OFFICER`.
3. Implement server-side authorization and API contract/integration tests before expanding UI workflows.
4. Prioritize device/telemetry ingestion, route/geofence alert generation, and driver/inspector workflows as the core operational gap.
5. Replace hardcoded report data and client-only date labels with parameterized backend reports.
6. Add end-to-end tests covering login, each role's permitted routes, owner tracking, route assignment, alert lifecycle, and admin actions.

## Evidence Index

- Routing and authentication: `src/App.js`, `src/pages/SignIn.jsx`, `src/api.js`.
- Roles and navigation: `src/components/SidebarLayout.jsx`.
- Tracking and route assignment: `src/pages/Dashboard.jsx`, `src/components/LiveMap.jsx`, `src/components/AssignRouteModal.jsx`.
- Alerts: `src/pages/Alerts.jsx`.
- Administration: `src/pages/AdminPanel.jsx`.
- Reporting: `src/pages/Reports.jsx`.
- Account settings: `src/pages/Settings.jsx`, `src/userPreferences.js`.
- Dependency and script inventory: `package.json`.