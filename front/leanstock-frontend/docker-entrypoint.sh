#!/bin/sh
set -e

export API_UPSTREAM_HOST="${API_UPSTREAM_HOST:-semgasabe-leanstock-api}"
export API_UPSTREAM_PORT="${API_UPSTREAM_PORT:-3000}"

envsubst '${API_UPSTREAM_HOST} ${API_UPSTREAM_PORT}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "[nginx] API upstream: ${API_UPSTREAM_HOST}:${API_UPSTREAM_PORT}"

exec nginx -g 'daemon off;'
