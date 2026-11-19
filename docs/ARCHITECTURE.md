# TeamHub ERP Architecture

## Runtime topology

```text
Browser
  │ HTTPS / secure cookies / CSRF header
  ▼
Nginx static host and reverse proxy
  ├── /                React/Vite SPA
  └── /api             Express API
                         │
                         ▼
                       MongoDB
```

## Frontend

The application is a React 19 single-page app. `App.jsx` defines route-level lazy loading and nested authorization boundaries. `AuthContext` restores the server session, handles attendance punch-in/out, and maintains active break timing and wake-lock behavior. `lib/api.js` is the only HTTP transport layer and supplies credentials, CSRF headers, normalized errors, session-expiry events, and protected downloads.

`Layout.jsx` provides role-aware navigation, module search, responsive sidebar behavior, theme persistence, live in-app notifications, account actions, and employee checkout. Feature pages remain independently lazy-loaded so employee, payroll, attendance, recruitment, and configuration code is not downloaded until needed.

## Backend

`app.js` is the compositional boundary. It applies request IDs, Helmet, CORS, compression, cookies, body limits, CSRF validation, structured access logging, rate limits, routes, 404 normalization, and central error handling.

Controllers own HTTP orchestration and validation. Models own persistence constraints and indexes. Services provide cross-cutting audit and notification delivery. Utilities provide deterministic errors, encryption, date windows, field whitelisting, logging, and async propagation.

## Authentication and authorization

1. Login validates normalized credentials, account status, lockout state, and password.
2. The server sets an HTTP-only JWT session cookie and readable cryptographically random CSRF cookie.
3. Unsafe cookie-authenticated requests must send the CSRF value through `X-CSRF-Token`.
4. Protected requests verify issuer, audience, expiry, user existence, active status, deletion status, and token version.
5. Privileged routes enforce server-side role checks.
6. Password changes, disablement, deletion, and logout increment token version, revoking existing tokens.

## Principal business workflows

### Attendance

Login performs an explicit punch-in. Employees can complete the day during sign-out, which performs verified punch-out. A compound user/date index prevents duplicate business-day records. The configurable shift cutoff maps overnight work to a deterministic logical date.

### Breaks

Configured daily break allowances are separate from manager-approved extra break requests. Break logs are owner-bound; another employee cannot end an active break. Ongoing breaks survive page refresh and keep the display awake when supported.

### Leave

Employees submit validated, non-overlapping leave requests with optional size/type-constrained attachments. Attachments are served only through authenticated ownership/admin checks. Admin decisions are immutable after processing and generate notifications.

### Profile updates

Employees can request changes only to approved profile fields. The API captures old/new values, prevents duplicate pending requests, applies approved changes through model validation, and records the reviewer.

### Payroll

Administrators generate idempotent monthly payroll records for active employees. Salary structures are joined in memory after bounded queries, existing records are skipped, amounts are computed without undefined values, and employees receive self-service statements with CSV and print/PDF output.

### Notifications and audit

Business events create recipient-specific in-app notifications without blocking the primary transaction if notification delivery fails. Selected outcomes also schedule SMTP email through encrypted administrator-configured accounts; mail failures are isolated from the core workflow. Privileged mutations generate append-only audit records containing actor, action, entity, request context, and sanitized metadata.

## Data model relationships

- `User` references role name, department, and shift identifiers used by configuration modules.
- `Attendance`, `BreakLog`, `BreakRequest`, `Leave`, `Payroll`, `ProfileRequest`, and `Notification` reference `User`.
- `SalaryStructure` has one record per user.
- `AuditLog` stores actor and entity references without coupling the log lifecycle to entity deletion.
- `Counter` atomically allocates employee identifiers.
- `Settings` stores typed configuration payloads; sensitive keys are encrypted before persistence and masked on output.

## Scalability boundaries

- High-read lists have filters, bounded limits, lean queries, and compound indexes.
- The frontend uses route-level code splitting.
- Static assets can be CDN-cached while API responses remain private/no-store where required.
- API instances are stateless; sessions are JWT-based and can be horizontally scaled behind a trusted proxy.
- MongoDB must run as a replica set before multi-document transactions are introduced for future cross-aggregate workflows.
