# TeamHub ERP Deployment Runbook

## 1. Credential rotation

The original uploaded project contained a populated server `.env`. Before any staging or production deployment, rotate:

- MongoDB username/password or connection credential
- JWT signing secret
- settings encryption key
- any integration/mail credentials previously persisted in application settings

Never copy the original `.env` into the new deployment.

## 2. Environment contract

Production requires:

```text
NODE_ENV=production
MONGO_URI=<secret connection string>
JWT_SECRET=<32+ random characters>
SETTINGS_ENCRYPTION_KEY=<separate random secret>
CORS_ORIGINS=https://erp.example.com
APP_BASE_URL=https://erp.example.com
TRUST_PROXY=true
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
```

Use `COOKIE_SAME_SITE=none` only for a genuinely cross-site frontend and API, and only with `COOKIE_SECURE=true`. Keep the client `VITE_CSRF_COOKIE_NAME` equal to the server `CSRF_COOKIE_NAME`.

## 3. Staging rollout

1. Create a sanitized copy of production data.
2. Run a backup and verify restoration into a disposable database.
3. Start the refactored backend against staging data.
4. Observe startup/index creation logs.
5. Resolve duplicate email, employee ID, attendance user/date, payroll user/month, or salary-structure user records before proceeding.
6. Seed the first super-admin only when necessary using strong one-time environment credentials.
7. Run role-by-role acceptance tests.

## 4. Docker Compose

Copy `.env.compose.example` to `.env`, replace every secret, then:

```bash
docker compose config
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs -f server
```

The example exposes the web tier at port 8080. In production, place a TLS-capable load balancer/reverse proxy in front or adapt the included Nginx configuration for certificates.

## 5. Non-container deployment

Backend:

```bash
cd server
npm ci --omit=dev
NODE_ENV=production npm start
```

Frontend:

```bash
cd client
npm ci
npm run build
```

Serve `client/dist` through Nginx with SPA fallback and reverse-proxy `/api` to the backend.

## 6. Database backup and restore

The scripts require MongoDB Database Tools.

```bash
cd server
MONGO_URI='...' BACKUP_ROOT=/secure/backups ./scripts/backup.sh
```

Restore is deliberately guarded:

```bash
CONFIRM_RESTORE=RESTORE_TEAMHUB MONGO_URI='...' ./scripts/restore.sh /secure/backups/teamhub-<timestamp>
```

Test restores regularly. Store backups encrypted, outside the application host, with retention matching company policy.

## 7. Health and monitoring

- Application health: `GET /api/health`
- Web health: `GET /healthz`
- A healthy API returns HTTP 200 only while MongoDB is connected; otherwise 503.
- Collect stdout/stderr logs with request IDs.
- Alert on 5xx rates, latency, lockouts, rate-limit events, process restarts, disk usage, and MongoDB replication/storage health.

## 8. Security headers and cookies

For production HTTPS:

- preserve `X-Forwarded-Proto` and enable `TRUST_PROXY`
- set secure cookies
- use an exact CORS origin list; never use wildcard with credentials
- keep uploads outside the public static root
- restrict database network access to application hosts
- store secrets in a managed secret store rather than image layers or source files

## 9. Rollback

1. Stop traffic to the new API.
2. Preserve logs and the failed release image.
3. Restore the pre-release database backup only if a data migration/index operation changed data and rollback requires it.
4. Redeploy the previous known-good image.
5. Re-run health and smoke tests before restoring traffic.

Because the current refactor does not include destructive schema migrations, application rollback normally requires an image rollback, while new indexes can remain. Validate this assumption against staging data before each release.
