#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8085/}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:8086/}"
DB_USER="${DB_USER:-pamplia}"
DB_NAME="${DB_NAME:-pamplia_dev}"

failures=0

check_http() {
  local name="$1"
  local url="$2"
  if curl -fsS "${url}" >/dev/null; then
    echo "[ok] ${name} ${url}"
  else
    echo "[fail] ${name} ${url}" >&2
    failures=$((failures + 1))
  fi
}

check_db() {
  if docker compose exec -T db psql -U "${DB_USER}" -d "${DB_NAME}" -c 'select 1;' >/dev/null 2>&1; then
    echo "[ok] db ${DB_NAME}"
  else
    echo "[fail] db ${DB_NAME}" >&2
    failures=$((failures + 1))
  fi
}

check_http "backend" "${BACKEND_URL}"
check_http "frontend" "${FRONTEND_URL}"
check_db

if [[ ${failures} -gt 0 ]]; then
  echo "healthcheck failed: ${failures} issue(s)" >&2
  exit 1
fi

echo "healthcheck passed"
