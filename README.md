# LeanStock API

Inventory Management System — Express.js + Prisma + PostgreSQL

## Quick Start (Docker)

```bash
# Clone the repo
git clone <your-repo-url>
cd leanstock-api

# Start everything (API + PostgreSQL + Redis)
docker compose up
```

The API will be available at `http://localhost:3000`
API docs (Swagger UI): `http://localhost:3000/api-docs`

---

## Manual Setup (without Docker)

**Requirements:** Node.js 20+, PostgreSQL 15+

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env and fill in your DATABASE_URL, JWT_SECRET, etc.

# 3. Run database migrations
npx prisma migrate deploy

# 4. Generate Prisma client
npx prisma generate

# 5. Start the server
npm start
```

---

## Environment Variables

See `.env.example` for all required variables.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `TENANT_ID` | Identifies the tenant this instance serves |
| `REDIS_URL` | Redis URL (optional — rate limiting falls back to memory) |
| `DECAY_THRESHOLD_DAYS` | Days before dead stock discount kicks in (default: 30) |
| `DECAY_PERCENT` | How much discount to apply per cycle (default: 10) |
| `DECAY_MAX_PERCENT` | Maximum discount cap (default: 50) |

---

## Running Tests

```bash
npm test
```

Tests use mocked database (no real DB needed). They cover:
- Auth: registration, login, JWT tokens, RBAC
- Inventory: overselling prevention, transfer atomicity, decay math
- Orders: status state machine, validation

---

## API Endpoints

All endpoints are documented in Swagger UI at `/api-docs`

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/register | Register a new user |
| POST | /api/v1/auth/login | Login, get access + refresh tokens |
| POST | /api/v1/auth/refresh | Get new access token using refresh token |
| POST | /api/v1/auth/logout | Revoke refresh token |
| GET  | /api/v1/auth/me | Get current user info |

### Products (require auth)
| Method | Path | Role |
|--------|------|------|
| GET | /api/v1/products | All |
| POST | /api/v1/products | MANAGER, ADMIN |
| PUT | /api/v1/products/:id | MANAGER, ADMIN |
| DELETE | /api/v1/products/:id | ADMIN only |

### Inventory (require auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/inventory | List inventory with filters |
| POST | /api/v1/inventory | Create inventory record |
| POST | /api/v1/inventory/:id/movements | Record stock movement |
| POST | /api/v1/inventory/transfer | Atomic transfer between locations |
| GET | /api/v1/inventory/alerts/low-stock | Low stock alerts |

### Orders (MANAGER, ADMIN)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/orders | List purchase orders |
| POST | /api/v1/orders | Create purchase order |
| PATCH | /api/v1/orders/:id/status | Update order status |

---

## Architecture Decisions

### Why Express.js?
Most of this course's labs use Node.js. Node's event loop is well-suited for inventory APIs where most operations are I/O-bound (reading/writing DB), not CPU-bound.

### Why Cursor-based Pagination?
OFFSET pagination gets slow on large tables because PostgreSQL still has to scan all skipped rows. Cursor pagination uses an index on `id` and is just as fast on page 1000 as page 1.

### Race Condition Prevention
Two strategies are used for the stock transfer endpoint:
1. **Redis distributed lock** — prevents two transfers from starting at the same time
2. **SELECT FOR UPDATE** — inside the Prisma transaction, locks the inventory rows so no other transaction can read/write them until this one finishes

Both together guarantee that overselling is impossible even under high traffic.

### Multi-tenancy
Every table has a `tenantId` column. Every query filters by `WHERE tenantId = current_tenant_id`. Indexes on `tenantId` ensure this is fast. This is "row-level security" at the application layer.

### Dead Stock Decay
A `node-cron` job runs every 72 hours. It finds all inventory items where `daysInInventory > DECAY_THRESHOLD_DAYS` (configurable, default 30) and applies a discount of `DECAY_PERCENT` (configurable, default 10%), up to a maximum of `DECAY_MAX_PERCENT` (configurable, default 50%). All decay settings are environment variables — nothing is hardcoded.

---

## Project Structure

```
leanstock-api/
├── src/
│   ├── config/         # Database client, env validation, Redis
│   ├── controllers/    # HTTP request handlers
│   ├── middleware/     # JWT auth, RBAC, rate limiter, error handler
│   ├── routes/         # URL routing
│   ├── services/       # Business logic (auth, inventory, audit)
│   ├── jobs/           # Dead stock decay cron job
│   ├── utils/          # asyncHandler, pagination, Redis lock, JWT
│   └── app.js          # Express setup, routes, Swagger UI
├── prisma/
│   ├── schema.prisma   # Database schema (source of truth)
│   └── migrations/     # Migration history
├── tests/              # Jest tests (unit + integration)
├── .github/workflows/  # CI/CD pipeline
├── docker-compose.yml
├── Dockerfile
└── openapi.yaml        # API specification
```
