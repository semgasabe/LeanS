# LeanStock Backend

Inventory Management System — Express.js + Prisma + PostgreSQL + Redis (BullMQ)

## Track: LeanStock
- Multi-tenant product catalog
- Atomic inventory transfer with Redis distributed lock
- Dead stock decay background worker (every 72 hours)
- Email notifications (verification, password reset, transfer alerts)

---

## Quick Start (Docker)

```bash
# Clone the repo
git clone https://github.com/semgasabe/leanstock.git
cd leanstock

# Start everything (API + PostgreSQL + Redis)
docker compose up --build
The API will be available at http://localhost:3000
API docs (Swagger UI): http://localhost:3000/api-docs

Note: Docker will start all services — no need to install PostgreSQL or Redis locally.

Manual Setup (without Docker)
Requirements: Node.js 20+, PostgreSQL 15+, Redis

bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# 3. Start PostgreSQL and Redis
# (use your local installations or Docker)

# 4. Run database migrations
npx prisma migrate deploy

# 5. Generate Prisma client
npx prisma generate

# 6. Start the server
npm start

Running Tests
bash
npm test
Tests cover:

Auth: registration, login, JWT tokens, RBAC

Inventory: overselling prevention, transfer atomicity, decay math

Orders: status state machine, validation

Docker Commands
bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Rebuild and start
docker compose up --build


