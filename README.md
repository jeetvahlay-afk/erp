# TeamHub ERP

TeamHub ERP is an employee-operations platform with workforce management, attendance, leave, breaks, recruitment, payroll, role administration, audit history, secure settings, dashboards, and employee self-service.

This repository contains:

- `client/` — React 19 + Vite enterprise web application
- `server/` — Express 5 + MongoDB/Mongoose API
- `docs/` — architecture, audit, API, deployment, and file-review records
- `deploy/` — Nginx configuration used by the production container
- `docker-compose.yml` — local/staging container stack

## Security model

Browser authentication uses an HTTP-only signed JWT cookie. State-changing browser requests require a matching double-submit CSRF token. Bearer JWT authentication remains supported for non-browser API clients. Role checks are enforced on the server; route visibility in the frontend is only a usability layer.
    
Before deploying this refactor, rotate the MongoDB credentials, JWT secret, and settings-encryption key used by the original package. The uploaded source contained a real `.env` file; the sanitized handoff excludes it.

## Local development

### Quick Start (All Services: ERP + Assessment Portal + Backend)

From the project root:

```bash
npm run dev
```

This single Node command launches:
- **ERP Web Client**: `http://localhost:5173`
- **Assessment Portal**: `http://localhost:5174`
- **Backend API**: `http://localhost:5000`

> **Note**: Even if you only start the ERP frontend (`cd client && npm run dev`), Vite will automatically detect and start the assessment portal on port 5174 in the background.

### Prerequisites

- Node.js 20+
- npm 10+
- MongoDB 7+

### Manual Startup (Individual Services)

#### 1. Backend

```bash
cd server
cp .env.example .env
npm ci  
npm run seed
npm run dev
```

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before running the seed command. The seed command refuses weak or missing credentials.

#### 2. ERP Frontend

```bash
cd client
cp .env.example .env
npm ci
npm run dev
```

Vite proxies `/api` to the configured backend during development and automatically launches the assessment portal on port 5174.

#### 3. Assessment Portal

```bash
cd assessment-client
npm ci
npm run dev
```

## Quality gates

```bash
cd server && npm run check && npm test && npm audit --omit=dev
cd client && npm run check && npm audit
```

The client `check` command runs linting, unit tests, and a production build. The server `check` command validates every JavaScript source file before tests run.

## Container deployment

Create a root `.env` containing the required Compose secrets, then run:

```bash
docker compose up --build -d
```

The web application is available at `http://localhost:8080`; Nginx serves the SPA and reverse-proxies `/api` to the backend.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Audit report](docs/AUDIT_REPORT.md)
- [API reference](docs/API.md)
- [Deployment runbook](docs/DEPLOYMENT.md)
- [Change log](docs/CHANGELOG.md)
- [File review checklist](docs/FILE_REVIEW_CHECKLIST.md)
- [Production validation record](docs/VALIDATION.md)
- [Enterprise UI and feature rebuild](docs/UI_REBUILD.md)
- [UI rebuild validation](docs/UI_VALIDATION.md)
- [UI phase file-change ledger](docs/UI_FILE_CHANGES.md)
