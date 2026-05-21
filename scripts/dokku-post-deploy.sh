#!/bin/sh
# Run ON THE DEPLOYROCKS SERVER (SSH) if web apps fail with:
#   Network semgasabe-leans-net does not exist
#   No web listeners specified
set -e

NETWORK=semgasabe-leans-net
API_APP=semgasabe-leans-api
FE_APP=semgasabe-leans-frontend

echo "Creating Docker network (if missing)..."
docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create "$NETWORK"

echo "Setting Dokku ports (web listeners)..."
dokku ports:set "$API_APP" http:80:3000 https:443:3000 || true
dokku ports:set "$FE_APP" http:80:80 https:443:80 || true

echo "Attaching apps to network..."
dokku network:set "$API_APP" attach-post-deploy "$NETWORK" || true
dokku network:set "$FE_APP" attach-post-deploy "$NETWORK" || true

echo "Restarting..."
dokku ps:restart "$API_APP" || true
dokku ps:restart "$FE_APP" || true

echo "Done. Check:"
echo "  dokku urls $API_APP"
echo "  dokku urls $FE_APP"
