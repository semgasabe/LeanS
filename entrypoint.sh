#!/bin/sh
set -e

echo "=== LeanStock API entrypoint ==="
echo "PORT=${PORT:-3000}"

echo "Waiting for database (8s)..."
sleep 8

echo "Running migrations..."
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

echo "Starting Node on port ${PORT:-3000}..."
exec node src/app.js
