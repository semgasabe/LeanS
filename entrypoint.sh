#!/bin/sh
set -e

echo "Waiting for database to be ready..."
sleep 5

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting the application..."
npm start