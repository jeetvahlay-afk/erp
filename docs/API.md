# TeamHub ERP API Reference

Base path: `/api`  
Content type: `application/json` unless an upload is documented.

## Authentication

Browser clients receive:

- HTTP-only session cookie: `teamhub.sid` by default
- readable CSRF cookie: `teamhub.csrf` by default

For `POST`, `PUT`, `PATCH`, and `DELETE` requests authenticated by cookie, send the CSRF cookie value in `X-CSRF-Token`. Login is exempt because no authenticated cookie is required. Non-browser clients may send `Authorization: Bearer <jwt>` and do not require the CSRF header.

### Error response

```json
{
  "message": "Human-readable explanation",
  "code": "MACHINE_READABLE_CODE",
  "details": null,
  "requestId": "request-correlation-id"
}
```

## Public and session endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | Public | API name/version |
| GET | `/api/health` | Public | DB state, uptime, timestamp |
| POST | `/api/auth/login` | Public/rate-limited | Create browser session |
| GET | `/api/auth/me` | Authenticated | Current user/session profile |
| POST | `/api/auth/verify` | Authenticated | Re-verify current password |
| POST | `/api/auth/logout` | Authenticated | Revoke sessions and clear cookies |
| POST | `/api/auth/register` | Admin/Super Admin | Create employee account |

Login body:

```json
{
  "email": "employee@example.com",
  "password": "strong-password",
  "remember": true
}
```

## Dashboard and notifications

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/dashboard` | Authenticated | Role-aware KPIs and recent activity |
| GET | `/api/notifications?limit=20&unreadOnly=true` | Authenticated | Own notifications/unread count |
| PATCH | `/api/notifications/read-all` | Authenticated | Mark all own notifications read |
| PATCH | `/api/notifications/:id/read` | Authenticated owner | Mark one notification read |
| DELETE | `/api/notifications/:id` | Authenticated owner | Delete one notification |

## Employees/users

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/users` | Admin/Super Admin | Search/filter/page employees |
| GET | `/api/users/:id` | Admin/Super Admin | Employee detail |
| PUT | `/api/users/:id` | Admin/Super Admin | Whitelisted employee update |
| PATCH | `/api/users/:id/status` | Admin/Super Admin | Enable/disable account |
| DELETE | `/api/users/:id` | Admin/Super Admin | Soft-delete/archive account |
| POST | `/api/users/bulk-shift` | Admin/Super Admin | Replace shift assignments |
| GET | `/api/users/profile` | Authenticated | Own profile |
| PUT | `/api/users/profile` | Authenticated | Change password with current password |

List query parameters include `search`, `role`, `department`, `isActive`, `page`, `limit`, and `sort=oldest|newest`. Pagination responses use:

```json
{
  "items": [],
  "pagination": { "page": 1, "limit": 50, "total": 0, "pages": 0 }
}
```

## Attendance

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/attendance/punch` | Authenticated | Explicit `in` or `out` action |
| GET | `/api/attendance` | Admin/Super Admin | Organization attendance |
| GET | `/api/attendance/user/:userId` | Admin/Super Admin | Employee attendance history |

Punch body: `{ "action": "in" }` or `{ "action": "out" }`.

## Breaks

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/breaks/my-breaks?date=YYYY-MM-DD` | Authenticated | Own break logs |
| POST | `/api/breaks/start` | Authenticated | Start allowed/configured break |
| PUT | `/api/breaks/end/:id` | Authenticated owner | End own active break |
| GET | `/api/breaks/user/:userId` | Admin/Super Admin | Employee break history |
| POST | `/api/break-requests` | Authenticated | Request extra break |
| GET | `/api/break-requests/my-requests` | Authenticated | Own extra-break requests |
| GET | `/api/break-requests` | Admin/Super Admin | All requests |
| PUT | `/api/break-requests/:id` | Admin/Super Admin | Approve/reject pending request |
| GET | `/api/daily-breaks` | Authenticated | Daily schedule/policy |
| POST | `/api/daily-breaks` | Admin/Super Admin | Set daily schedule |
| DELETE | `/api/daily-breaks` | Admin/Super Admin | Reset daily schedule |

## Leave

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/leaves` | Authenticated | Submit multipart leave request |
| GET | `/api/leaves/my-leaves` | Authenticated | Own leave history |
| GET | `/api/leaves/:id/attachment` | Owner/Admin | Protected attachment download |
| GET | `/api/leaves` | Admin/Super Admin | All leave requests |
| PUT | `/api/leaves/:id/status` | Admin/Super Admin | Approve/reject pending leave |

Multipart fields: `leaveType`, `startDate`, `endDate`, `reason`, optional `attachment`.

## Profile change requests

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/profile-requests` | Authenticated | Submit approved-field change |
| GET | `/api/profile-requests/my` | Authenticated | Own request history |
| GET | `/api/profile-requests` | Admin/Super Admin | All requests |
| PUT | `/api/profile-requests/:id` | Admin/Super Admin | Approve/reject request |

## Payroll and salary

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/payroll/my` | Authenticated | Own payroll statements |
| GET | `/api/payroll` | Admin/Super Admin | Filter payroll records |
| POST | `/api/payroll/generate` | Admin/Super Admin | Idempotently generate month |
| PUT | `/api/payroll/:id` | Admin/Super Admin | Update payment status/method/reference |
| GET | `/api/salary/:userId` | Admin/Super Admin | Employee salary structure |
| POST | `/api/salary` | Admin/Super Admin | Create/update salary structure |

Payroll generation body: `{ "month": "2026-07" }`.

## Recruitment/interviews

All routes require one of: `admin`, `super admin`, `recruiter`, `hr`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/interviews` | List/filter interviews |
| GET | `/api/interviews/:id` | Interview detail |
| POST | `/api/interviews` | Create interview |
| PUT | `/api/interviews/:id` | Update interview |
| DELETE | `/api/interviews/:id` | Delete interview |

## Departments

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/departments` | Authenticated | List departments with counts |
| GET | `/api/departments/:id` | Authenticated | Department detail |
| POST | `/api/departments` | Admin/Super Admin | Create department |
| PUT | `/api/departments/:id` | Admin/Super Admin | Update department |
| PATCH | `/api/departments/:id/toggle` | Admin/Super Admin | Activate/deactivate |
| DELETE | `/api/departments/:id` | Admin/Super Admin | Delete unused department |

## Roles, routes, and settings

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/roles` | Admin/Super Admin | List roles |
| POST | `/api/roles` | Admin/Super Admin | Create role |
| PUT | `/api/roles/:id` | Admin/Super Admin | Update role |
| DELETE | `/api/roles/:id` | Admin/Super Admin | Delete unused non-system role |
| GET | `/api/settings` | Admin/Super Admin | All setting groups |
| GET | `/api/settings/:type` | Admin/Super Admin | One masked setting group |
| POST | `/api/settings/:type` | Admin/Super Admin | Encrypt and save setting group |
| POST | `/api/settings/mail/test` | Admin/Super Admin | Send an SMTP verification email from a configured account |

Route access assignments are stored on user/role configuration and UI visibility, while server endpoint permissions remain explicit and authoritative.

## Audit logs

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/audit-logs` | Admin/Super Admin | Search/filter/page audit history |

Common filters: `action`, `entityType`, `actor`, `from`, `to`, `page`, `limit`.
# TeamHub ERP 3.0 response contract

All JSON endpoints return `success`, `message`, `data`, `pagination`, `meta`, `errors`, and `timestamp`. Successful collection endpoints place records in `data` and paging information in `pagination`. Failed requests return `data: null` and structured entries in `errors`; `meta.requestId` can be matched with server logs.

The authenticated preference endpoints are:

- `GET /api/users/preferences/me`
- `PATCH /api/users/preferences/me`

The update endpoint accepts allowlisted `appearance` values and bounded `navigation.favorites` / `navigation.recent` arrays. Preferences belong to the authenticated user and persist across sessions.
