# CHANGELOG

## Sprint 1 - Implementation

### Deviations from Blueprint

**1. `cookie-parser` added**
The blueprint did not mention cookie-parser but refresh tokens are stored in HTTP-only cookies for better security. Added `cookie-parser` middleware.

**2. `/api/v1/inventory/transfer` endpoint added**
The blueprint openapi.yaml did not have a dedicated transfer endpoint. Added `POST /api/v1/inventory/transfer` as required by the LeanStock track specification (atomic transfer with SELECT FOR UPDATE + Redis lock).

**3. `/api/v1/inventory/alerts/low-stock` endpoint added**
Extra endpoint to surface low-stock alerts. Not in original blueprint but makes sense as core business feature.

**4. `GET /api/v1/auth/me` endpoint added**
Small convenience endpoint to get current user from token. Useful for frontend and Postman testing.

**5. Dead stock decay settings made configurable via env vars**
Blueprint showed hardcoded 10%/30 days/50% cap. All three values are now environment variables (`DECAY_PERCENT`, `DECAY_THRESHOLD_DAYS`, `DECAY_MAX_PERCENT`) as required by the implementation rubric ("configurable decay rules - not hardcoded").

### What matches the blueprint exactly

- All 6 tables from database-schema.docx
- Prisma schema matches schema.prisma from the blueprint
- All auth endpoints (register, login, refresh, logout)
- JWT access token (15min) + refresh token (7 days, stored in DB, revocable)
- RBAC with ADMIN / MANAGER / STAFF roles
- Rate limiting on /auth/login and /auth/register
- Cursor-based pagination on all list endpoints
- CORS configured with explicit origins (no wildcard)
- Audit log for all data changes
- SELECT FOR UPDATE inside transaction for inventory transfer
- Redis lock wrapping the transfer endpoint
