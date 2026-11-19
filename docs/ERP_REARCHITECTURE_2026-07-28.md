# TeamHub ERP 3.0 — Redesign and Rearchitecture Record

**Completed:** 28 July 2026  
**Scope reviewed:** all authored client and server source, application routes, controllers, models, middleware, services, utilities, validation, tests, deployment configuration, generated output, and prior project documentation.

## Product scope

TeamHub is a workforce and HR operations ERP. The working domains in this release are:

- authentication, cookie sessions, CSRF, account lockout, and profile security;
- users, employee records, roles, permissions, route overrides, and departments;
- attendance, live attendance, shifts, breaks, break requests, and leave;
- salary structures, monthly payroll, payslips, and payroll status;
- recruitment and interview workflows;
- tasks, internal employee mail, chat, announcements, events, birthdays, documents, and directory;
- notifications, audit events, configuration, SMTP accounts, and deployment operations.

No unrelated finance, procurement, stock, manufacturing, or CRM pages were fabricated.

## Architecture decisions

### API compatibility and standardization

Every JSON response now uses this envelope:

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {},
  "pagination": null,
  "meta": {
    "requestId": "..."
  },
  "errors": null,
  "timestamp": "2026-07-28T00:00:00.000Z"
}
```

The server applies the contract centrally so controllers cannot drift. The browser transport unwraps the envelope into the legacy page-level shapes while modules are migrated, preserving all existing real API integrations.

Errors use the same top-level fields and place machine-readable error codes and validation details in `errors`.

### Theme and design tokens

Appearance settings are stored on the authenticated user record and loaded on sign-in. Runtime CSS variables control the complete authenticated application rather than isolated pages.

Persisted controls include:

- light, dark, system, and custom modes;
- primary, secondary, accent, semantic status, navigation, surface, border, table, hover, link, and icon colors;
- font family, base size, heading scale, line height, weight, and letter spacing;
- radius, density, sidebar width, content width, navbar height, spacing, motion speed, shadow, blur, and glass surfaces.

All settings are validated against an explicit server-side allowlist before persistence.

### Shared enterprise components

The shared component layer now provides:

- profile-backed design tokens and responsive density;
- reusable page headers, panels, KPIs, status chips, charts, states, buttons, search, pagination, and modal primitives;
- focus-trapped, Escape-close dialogs with focus restoration;
- table-level sticky headers, responsive scrolling, compact/comfortable/spacious density, CSV export, Excel-compatible SpreadsheetML export, and isolated print/PDF output;
- centralized empty, error, loading, toast, and confirmation experiences.

### Navigation and command palette

The authenticated shell includes role/permission-aware navigation, a `Ctrl/Cmd + K` command palette, accessible search, notifications, profile actions, responsive sidebar behavior, and direct personal appearance access. Search results only expose routes available to the current user.

## Confirmed bug fixes

1. Employee-mail administrative routes used `super_admin`, while persisted system roles use `super admin`. The mismatch prevented legitimate super administrators from managing employee mailbox assignments.
2. Controller response shapes were inconsistent and required defensive parsing across pages. A single response boundary now normalizes success and error payloads.
3. Appearance was stored only in one browser. Theme, typography, spacing, density, and layout settings now follow the authenticated user across devices.
4. Tables had no consistent export, print, or density interface. These capabilities are now supplied by the shared table shell.
5. Shared dialogs did not trap keyboard focus or restore it after closing. This is now handled centrally.
6. Several dashboard and employee-creation views used inline font-size values. Typography now comes from design-system classes and tokens.
7. `nodemon` was incorrectly installed as a production dependency. It has been moved to development dependencies.

## Security and data integrity

The existing secure foundation was retained:

- HTTP-only JWT cookie sessions;
- double-submit CSRF validation;
- strict origin allowlist;
- Helmet, compression, request limits, and rate limiting;
- password hashing, login lockout, token-version revocation, and disabled-user checks;
- role and permission guards;
- safe upload restrictions and authenticated HR document delivery;
- settings encryption and response masking;
- append-only audit records;
- query indexes and soft deletion.

The new preference endpoint is owner-bound, accepts no arbitrary user fields, and limits nested navigation history and favorites.

## Validation status

The release gate covers:

- server syntax validation;
- server unit and HTTP contract tests;
- client ESLint;
- client unit tests;
- production client build and lazy chunks;
- production dependency audit;
- secret and generated-output exclusion from the distribution archive.

MongoDB-backed end-to-end workflow testing still requires a staging database containing representative sanitized business data. That operational step cannot be truthfully simulated with hardcoded data.

## Deployment requirements

Before production rollout:

1. rotate any credentials that were ever distributed in a `.env` archive;
2. test new indexes against a sanitized staging copy and resolve duplicate records;
3. run role-by-role browser acceptance tests against staging;
4. verify backup and restore procedures;
5. configure exact production origins, TLS, secure cookies, reverse-proxy trust, secret management, and centralized monitoring.
