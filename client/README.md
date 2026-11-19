# TeamHub ERP Client

React 19/Vite frontend for TeamHub ERP.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run check
```

## Environment

Copy `.env.example` to `.env`. Keep `VITE_API_URL` empty when the client and API are served through the same reverse proxy. `VITE_CSRF_COOKIE_NAME` must match the backend `CSRF_COOKIE_NAME`.

## Architecture

- `src/components` — application shell, route guards, feedback, and common UI
- `src/context` — authenticated session and break-state orchestration
- `src/lib` — API client and cross-cutting services
- `src/pages` — lazy-loaded feature modules
- `src/utils` — deterministic date/business-day helpers

The browser never stores the real JWT. A non-sensitive session marker is retained only to preserve UI profile state and remember-login preference; the authoritative session is the HTTP-only server cookie.
