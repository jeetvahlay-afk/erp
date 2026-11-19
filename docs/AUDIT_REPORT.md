# TeamHub ERP Production Audit

**Audit date:** 17 July 2026  
**Scope:** Complete application source, configuration, package manifests/lockfiles, build configuration, routes, controllers, models, utilities, assets, and generated-package hygiene. Dependency directories and generated build outputs were inspected as artifacts but were not treated as authored source.

## Executive assessment

The uploaded application contained a useful HR/employee-operations foundation, but it was not safe to deploy unchanged. The highest-risk findings were authentication/authorization bypasses, exposed production configuration, arbitrary-field profile writes, ownership failures, a payroll generation crash, missing centralized security/error infrastructure, hard-coded development API addresses, and a monolithic frontend bundle.

The refactored codebase now has a coherent production architecture, secure cookie sessions with CSRF defense, strict role and ownership enforcement, normalized validation/errors, audit history, notifications, indexes, deployment assets, automated checks, and a redesigned responsive shell. It is suitable for controlled staging and user-acceptance testing. Production approval remains conditional on credential rotation, staging migration rehearsal, database backup verification, and browser-based end-to-end testing against a non-production MongoDB instance.

## Critical findings and remediation

| Severity | Original finding | Business impact | Implemented remediation |
|---|---|---|---|
| Critical | A secret-bearing `server/.env` was packaged with source | Database/JWT compromise if distributed | Excluded from handoff and Git; added strict examples and deployment contract. Original credentials must be rotated. |
| Critical | Registration could create privileged users without a protected administrator flow | Full account takeover/privilege escalation | Registration is authenticated, admin-only, field-whitelisted, role-validated, and super-admin assignment is restricted. |
| Critical | Disabled users could authenticate | Terminated/disabled accounts retained access | Login and every protected request enforce active/deleted state. |
| Critical | Profile updates accepted arbitrary request fields | Mass assignment and unauthorized data modification | Password change is the only direct profile mutation; normal profile fields use an approved request workflow. |
| Critical | Break completion was not reliably owner-bound | One employee could modify another employee’s time record | Break end queries require both record ID and authenticated owner. |
| Critical | Payroll generation referenced undefined values | Entire monthly payroll generation could crash | Rebuilt deterministic payroll calculation and idempotent batch generation. |
| High | JWT was stored in browser-accessible storage | XSS could steal persistent credentials | Real JWT moved to HTTP-only cookie; browser storage holds no credential. |
| High | No CSRF control for browser sessions | Cross-site state-changing actions | Double-submit CSRF token is required for unsafe cookie-authenticated requests. |
| High | Weak/inconsistent error handling | Information leakage and unreliable clients | Central `AppError`, async propagation, request IDs, normalized status/code/message contract. |
| High | Sensitive settings could be stored and returned in plaintext | Credential exposure through DB/API | Recursive encryption at rest and masking in API responses. |
| High | Leave attachments could be exposed through static paths | Private HR document leakage | Authenticated owner/admin download endpoint with safe path resolution and no-store response. |
| High | Hard-coded localhost URLs across frontend | Production deployment failure | Shared environment-based API client and Vite proxy. |
| High | No audit trail for privileged changes | Weak compliance/accountability | Append-only audit model/service and admin audit viewer. |
| Medium | Missing/insufficient uniqueness and query indexes | Duplicates and degraded performance | Added compound, unique, partial, and TTL indexes by access pattern. |
| Medium | Unbounded/duplicated frontend requests | Slow pages and unnecessary DB/network load | Direct resource endpoints, pagination bounds, lean queries, debouncing, and shared transport. |
| Medium | Single large frontend bundle | Slow initial load | Route-level lazy loading and vendor chunk separation. |
| Medium | Browser alerts/confirms and inconsistent states | Poor usability/accessibility | Unified toast/confirmation provider, skeletons, empty/error states, and dedicated 403/404 boundaries. |

## Architecture review

### Original

- Express startup, middleware, and routing were tightly coupled.
- Controllers mixed validation, authorization assumptions, persistence, and response formatting.
- Client pages instantiated or configured HTTP behavior inconsistently.
- Authentication state depended on a locally stored token.
- No formal service layer existed for cross-cutting audit/notification behavior.
- Deployment, backup, health, CI, and production configuration guidance were absent or incomplete.

### Refactored

- `server/src/app.js` composes middleware and routes; `index.js` owns process/database lifecycle.
- Environment parsing fails fast for missing production secrets and invalid cookie combinations.
- Controllers use shared validators, field whitelists, async handling, semantic errors, and audit services.
- Models enforce persistence constraints and indexes.
- `client/src/lib/api.js` centralizes credentials, CSRF, errors, downloads, and session-expiry behavior.
- Feature pages are lazy-loaded behind nested role guards.
- Containers, Nginx, CI, health checks, backup/restore scripts, and deployment runbook are included.

## Database review

### Improvements

- User email/employee identifiers are normalized and unique.
- Employee identifiers use an atomic counter rather than a race-prone count-plus-one strategy.
- Attendance uses a unique user/logical-date index.
- Leave overlap is checked for pending/approved ranges.
- Payroll and salary structures enforce user/month and user uniqueness.
- Break, request, notification, audit, interview, department, and settings access patterns have indexes.
- Notification expiry uses a TTL index.
- Soft-deleted users are excluded from normal queries.
- Sensitive settings are encrypted using authenticated encryption.

### Operational note

Index creation must be observed during staging startup, especially if production data already contains duplicates that violate new unique indexes. Resolve conflicts before enabling automatic index creation in a production rollout.

## Security review

Implemented controls include Helmet, strict CORS allowlisting, body/upload limits, compression, rate limiting, account lockout, bcrypt cost bounds, JWT issuer/audience/expiry verification, token-version revocation, HTTP-only/secure cookie support, CSRF defense, ownership checks, RBAC, no-store protected downloads, safe filenames, mass-assignment prevention, encrypted settings, secret-free examples, and normalized production errors.

The SMTP module now decrypts credentials only in memory, supports test delivery, and sends selected workflow notifications without blocking the primary transaction. The application does not render user-provided HTML and does not use `dangerouslySetInnerHTML`, reducing XSS exposure. CSRF protection applies to state-changing requests only when cookie authentication is present; bearer API clients are unaffected.

## Frontend/UI/UX review

- Replaced the original shell with role-aware enterprise navigation.
- Added dashboard KPIs and operational summaries.
- Added global module search and keyboard shortcut.
- Added responsive/mobile navigation and accessible labels.
- Added theme persistence and reduced-motion/print styles.
- Added skeleton, empty, error, success, 403, 404, and error-boundary states.
- Added employee self-service payroll with CSV and print/PDF output.
- Added real notifications with unread badge, mark-read, mark-all, action navigation, and optional SMTP delivery.
- Replaced blocking native alerts/confirms with consistent feedback UI.
- Added protected attachment downloads.
- Removed nonfunctional promotional UI and misleading indicators.
- Corrected broken settings/navigation paths.

## Performance review

- Frontend production output is split into lazy feature chunks. The shared React bundle is approximately 224 KB before gzip and approximately 72 KB gzip; feature modules load on demand.
- MongoDB reads use `lean()` where mutation is unnecessary.
- List limits are bounded and high-value paths use indexes.
- Payroll generation performs bounded batch queries rather than per-user query loops.
- Employee details request a single employee instead of loading the full workforce.
- Search input behavior is debounced where applicable.
- API responses are compressed and the application is stateless for horizontal scaling.

## Reliability and error handling

- Async errors propagate to one handler.
- Duplicate key, validation, cast, upload, JWT, rate-limit, CORS, authorization, and not-found failures return consistent HTTP status codes and machine-readable codes.
- Every request receives an `X-Request-Id` that is included in error responses and logs.
- Startup validates environment and waits for MongoDB.
- Shutdown handles SIGINT/SIGTERM and closes MongoDB cleanly.
- Health endpoint reports process uptime and database state with 200/503 semantics.
- Business notifications are deliberately non-blocking after the primary workflow commits.

## Module ratings

Scores represent deployability and maintainability within the current ERP scope, not feature parity with a global full-suite ERP.

| Module | Before | After | Notes |
|---|---:|---:|---|
| Application architecture | 3/10 | 8.5/10 | Clear composition, services, validation, error boundaries, docs |
| Authentication/session security | 2/10 | 9/10 | Cookie JWT, CSRF, lockout, revocation, active checks |
| Authorization/RBAC | 3/10 | 8.5/10 | Protected creation, role boundaries, ownership controls |
| User/employee management | 4/10 | 8.5/10 | Whitelists, atomic IDs, soft delete, status safeguards |
| Attendance | 5/10 | 8/10 | Logical day, explicit actions, uniqueness, admin detail |
| Break management | 3/10 | 8.5/10 | Ownership, approvals, policies, restored timers |
| Leave management | 4/10 | 8.5/10 | Overlap checks, protected files, immutable review |
| Profile requests | 2/10 | 8.5/10 | Approved field matrix and review history |
| Payroll/salary | 2/10 | 8.5/10 | Crash fixed, idempotent generation, self-service statements |
| Recruitment/interviews | 5/10 | 7.5/10 | Secured roles, validation, improved states |
| Departments/shifts/configuration | 4/10 | 8/10 | Aggregations, safeguards, structured settings |
| Sensitive settings/integrations | 2/10 | 8.8/10 | Encrypted/masked persistence, SMTP test, strict access |
| Dashboard/reporting | 2/10 | 8/10 | Operational KPIs and summaries |
| Notifications | 0/10 | 8/10 | Real recipient-specific in-app notifications |
| Audit/compliance | 1/10 | 8.5/10 | Request-context audit trail and viewer |
| Frontend architecture | 4/10 | 8.5/10 | Shared API, lazy modules, route guards, consistent UX |
| Accessibility/responsiveness | 4/10 | 8/10 | Keyboard, labels, focus, mobile, reduced motion |
| Testing/quality gates | 1/10 | 7.5/10 | Lint, unit/API tests, syntax checks, production build, CI |
| DevOps/deployment | 1/10 | 8/10 | Containers, proxy, health, backup scripts, runbook |
| Overall production readiness | 3/10 | 8.4/10 | Ready for staging; production conditional on rollout validation |

## Confirmed validation results

- Server source syntax check: passed
- Server tests: 11 passed, 0 failed
- Client ESLint: passed with no errors
- Client unit tests: 4 passed, 0 failed
- Client production build: passed
- Server production dependency audit: 0 known vulnerabilities
- Client dependency audit: 0 known vulnerabilities
- Secret/generated-artifact hygiene scan: sanitized handoff excludes `.env`, uploads, caches, build output, dependency directories, and Git metadata

## Required pre-production actions

These are deployment controls rather than unfinished source-code work:

1. Rotate the original MongoDB credential, JWT secret, and any credentials stored in the uploaded environment/settings data.
2. Restore a sanitized production-data copy into staging and resolve any duplicate data before new unique indexes are created.
3. Run browser end-to-end tests for each role against staging, including overnight attendance, concurrent payroll generation, leave attachments, and mobile navigation.
4. Verify backup and restore scripts against the staging database and record recovery time/recovery point objectives.
5. Terminate TLS at the reverse proxy/load balancer and set `COOKIE_SECURE=true`, trusted proxy configuration, and exact production origins.
6. Configure centralized log collection, uptime monitoring, MongoDB alerts, and infrastructure-level secret management.

## Scope boundaries

The codebase is an HR/workforce ERP, not a complete SAP/Oracle-equivalent finance, inventory, procurement, manufacturing, or CRM suite. Adding unrelated enterprise domains without approved requirements would create unsafe speculative business logic. The refactor therefore completes and strengthens the workflows present in this product and adds cross-cutting enterprise capabilities that are directly applicable to them.
