#!/bin/sh
set -e

echo "=== LeanStock API entrypoint ==="
echo "PORT=${PORT:-3000}"

echo "Waiting for database (8s)..."
sleep 8

echo "Running migrations..."
npx prisma migrate resolve --applied "20240519000000_init" 2>/dev/null || true

max_attempts=20
attempt=0
until npx prisma migrate deploy; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "WARN: migrate deploy failed, trying db push..."
    npx prisma db push --accept-data-loss || {
      echo "ERROR: Database setup failed"
      exit 1
    }
    break
  fi
  echo "DB not ready (${attempt}/${max_attempts}), retry in 2s..."
  sleep 2
done

if [ "$NODE_ENV" = "development" ] || [ "$SEED_DEV_ADMIN" = "true" ]; then
  echo "Seeding dev admin (optional)..."
  node prisma/seed.js 2>/dev/null || echo "WARN: seed skipped"
fi

echo "Starting Node on port ${PORT:-3000}..."
exec node src/app.js
