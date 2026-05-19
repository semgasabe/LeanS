#!/bin/sh
set -e

echo "Waiting for database to be ready (minimum 12s)..."
sleep 12

max_attempts=30
attempt=0
until npx prisma migrate deploy; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database migrations failed after ${max_attempts} attempts"
    exit 1
  fi
  echo "Database not ready yet (attempt ${attempt}/${max_attempts}), retrying in 2s..."
  sleep 2
done

echo "Starting the application..."
exec node src/app.js
