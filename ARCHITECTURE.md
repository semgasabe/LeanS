# LeanStock - Architecture Notes

## Framework Choice: Express.js (Node.js)

Chosen because all course labs use Node.js. Node's event loop handles many concurrent HTTP requests efficiently for I/O-heavy workloads (most inventory operations are DB reads/writes, not CPU work).

## Database: PostgreSQL 15+

PostgreSQL is required for ACID transactions. Every stock change (movements, transfers, order receiving) happens inside a Prisma `$transaction` call, which maps to a PostgreSQL transaction. If any step fails, the whole thing rolls back — no partial updates.

## ORM: Prisma

All database access uses the Prisma ORM. Zero raw SQL queries in the codebase. This satisfies the assignment constraint and also provides type safety and protection against SQL injection via parameterized queries.

### Known Limitation: Cross-Column Comparison
Prisma cannot natively express `WHERE quantity <= minQuantity` (comparing two columns in the same row). The `GET /inventory/alerts/low-stock` endpoint fetches all inventory for the tenant and filters in JavaScript. For a real production system with millions of rows, a PostgreSQL view or computed column would be better. This is documented in `inventoryController.js` with a comment.

## Race Condition Strategy: Redis Distributed Lock

The assignment allows **SELECT FOR UPDATE OR Redis Redlock**. We chose Redis Redlock because:
- Prisma does not support `SELECT FOR UPDATE` without raw SQL
- The assignment says "Zero raw SQL queries allowed"
- Redis lock achieves the same mutual exclusion guarantee

**How it works:**
1. Before any stock transfer, we acquire a Redis lock on the sorted pair of inventory IDs
2. Sorting the IDs (`[A, B].sort()`) ensures `A→B` and `B→A` always lock the same key — prevents deadlocks
3. The lock has a 5-second TTL — even if the server crashes, the lock auto-expires
4. If Redis is not available (dev mode), the lock is skipped and only the Prisma transaction is used for atomicity

When Redis IS available, the combination of lock + transaction guarantees:
- Only one transfer can modify a given inventory pair at a time (Redis lock)
- The read-then-write is atomic (Prisma transaction)

## Multi-tenancy: Row-Level Security at Application Layer

Every table has a `tenantId` column. Every Prisma query filters by `where: { tenantId: user.tenantId }`. The `user.tenantId` comes from the JWT payload, which is set at registration time.

All tables have `@@index([tenantId])` in the Prisma schema so tenant-scoped queries are fast.

We chose row-level security over schema-per-tenant because:
- Much simpler migrations (one `prisma migrate deploy` not N)
- Easier to query across tenants for admin purposes
- Good enough for small-medium scale

## Dead Stock Decay

A `node-cron` job runs every 72 hours. All three decay parameters are environment variables — nothing is hardcoded:
- `DECAY_THRESHOLD_DAYS` — how many days before an item is considered dead stock (default 30)
- `DECAY_PERCENT` — how much discount to add per cycle (default 10)
- `DECAY_MAX_PERCENT` — maximum discount cap (default 50)

The job runs inside a Prisma transaction so all updates are atomic. If the job crashes halfway, no partial discounts are applied.

## JWT Strategy

- Access token: 15 minutes expiry, HS256 signed with `JWT_SECRET`
- Refresh token: 7 days expiry, signed with `JWT_REFRESH_SECRET` (different secret!)
- Refresh tokens are stored in the `RefreshToken` table so they can be individually revoked (logout)
- Refresh tokens are sent as HTTP-only cookies (not readable by JavaScript)
- On logout, the token's `revoked` flag is set to `true` in the database

Using a different secret for refresh tokens means a compromised access token secret does not affect refresh tokens.

## Pagination: Cursor-based (Keyset)

All list endpoints use cursor-based pagination. OFFSET pagination is avoided because it gets slow on large tables — PostgreSQL must scan and count all rows before the offset. Cursor pagination uses a stable index on `id` and is equally fast on any page.

Pattern: fetch `limit + 1` items. If we get `limit + 1`, there is a next page and we return the last ID as `nextCursor`. Otherwise `nextCursor` is null.
