# TeamHub ERP API

Express 5 and Mongoose API for TeamHub ERP.

## Commands

```bash
npm ci
npm run dev
npm run check
npm test
npm run seed
npm start
```

## Required environment variables

- `MONGO_URI`
- `JWT_SECRET` (minimum 32 characters in production)
- `SETTINGS_ENCRYPTION_KEY` (required in production and separate from JWT secret)

See `.env.example` for the complete configuration contract.

## Request security

- HTTP-only JWT session cookie for browsers
- CSRF token cookie + `X-CSRF-Token` on unsafe cookie-authenticated requests
- Bearer JWT compatibility for API clients
- account-active and token-version checks on every protected request
- role authorization on privileged routes
- global and authentication-specific rate limits
- Helmet, strict CORS allowlist, compressed responses, bounded bodies/uploads
- normalized error responses with request IDs

## Data safety

The API uses whitelist updates, schema validation, ownership checks, unique/compound indexes, soft deletion for users, encrypted sensitive settings, audit records, and atomic employee number allocation.
