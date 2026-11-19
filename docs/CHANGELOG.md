# Enterprise Refactor Change Log

## Platform foundation

- Split Express application composition from process startup and database lifecycle.
- Added validated environment configuration and production secret requirements.
- Added request IDs, normalized error responses, async error propagation, structured logging, CORS allowlisting, Helmet, compression, body bounds, rate limits, and graceful shutdown.
- Added health checks and deployment-safe API metadata.

## Authentication and security

- Replaced browser-local JWT storage with HTTP-only cookie sessions.
- Added CSRF token validation for unsafe cookie-authenticated requests.
- Preserved bearer authentication for external API clients.
- Added issuer/audience verification, token version revocation, account lockout, active/deleted checks, secure password changes, and logout-all behavior.
- Protected employee registration and super-admin assignment.
- Added whitelist-based writes and ownership checks.
- Encrypted and masked sensitive settings, including legacy plaintext SMTP credential migration and stable-ID preservation during account reordering.
- Secured leave attachment validation and download.

## Data and business logic

- Added atomic employee ID counter.
- Added unique/compound/partial/TTL indexes aligned to query patterns.
- Reworked attendance logical-date handling and explicit punch actions.
- Fixed break ownership, duplicate ongoing breaks, and request processing.
- Added leave overlap validation and immutable review workflow.
- Restricted profile requests to approved fields.
- Rebuilt payroll generation to eliminate undefined values, N+1 patterns, and duplicate monthly records.
- Added department aggregations and deletion safeguards.
- Added append-only audit logs.
- Added real in-app notifications for leave, break, profile, and payroll events, plus non-blocking SMTP delivery for selected outcomes and an administrator test-email action.

## Frontend architecture and UX

- Added a shared API/CSRF/session transport.
- Added lazy-loaded routes and vendor chunking.
- Rebuilt the application shell with role-aware navigation, global module search, mobile navigation, persistent theme, live notifications, and secure checkout.
- Added dashboard, audit viewer, employee payroll self-service, 403, 404, error boundary, page loader, toast, confirmation, skeleton, empty, and error states.
- Replaced native browser alerts/confirms.
- Replaced hard-coded development URLs.
- Added authenticated attachment downloads and direct employee detail loading.
- Added CSV export and print/PDF support for employee payroll statements.
- Improved keyboard labels, focus behavior, reduced-motion handling, and print styles.

## Quality and operations

- Added frontend lint/test/build quality gate.
- Added backend syntax/tests quality gate.
- Removed unused vulnerable mail dependency and generated/template files.
- Added CI workflow, Dockerfiles, Compose stack, Nginx proxy/static configuration, backup/restore scripts, environment examples, deployment runbook, API reference, architecture documentation, and audit report.

## Preadmin-inspired enterprise UI and feature phase — 17 July 2026

- Rebuilt the entire application shell using a flat, compact HRMS visual system with restrained radii, orange primary actions, navy/teal supporting colors and dense enterprise tables.
- Added six live dashboards: Admin, Employee, HR, Payroll, Recruitment and Attendance.
- Added shared panels, metrics, table shells, charts, status indicators, modals, avatars, empty/error/loading states and export helpers.
- Rebuilt employee, attendance, leave, payroll, recruitment, department, settings, role, shift, break, audit and profile workflows using the shared UI system.
- Added database-backed profile images, employee permission assignment, attendance correction and dashboard analytics.
- Removed all visual-reference sample names, totals and decorative mock records from authored source.
- Replaced remaining excessive rounded UI in candidate details, attendance details, break lock and fatal-error screens.
- Added route-level role-or-permission guards across client and server modules.
# 3.0.1 — Access and appearance persistence

- Fixed administrator sessions being sent to the restricted workspace page.
- Replaced implicit role-based sidebar defaults with explicit per-employee route assignments.
- Enforced assigned-route access for both sidebar navigation and direct URLs.
- Preserved full administrator access so access management cannot be locked out.
- Made new employee accounts start with no workspace routes until an administrator assigns them.
- Sanitized saved route assignments and derived the required API permissions server-side.
- Fixed theme changes disappearing when the browser refreshes during a pending save.
- Added local recovery for appearance changes when the API is temporarily unavailable.
- Applied the configured font family, base size, line height, letter spacing, and heading scale globally.
- Added route-access regression tests for administrator recovery, explicit assignments, dynamic routes, and invalid routes.
