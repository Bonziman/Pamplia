#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./ops/restore_db.sh /path/to/backup.dump
# Optional env vars:
#   DB_USER=pamplia DB_NAME=pamplia_dev

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /absolute/or/relative/path/to/backup.dump" >&2
  exit 1
fi

BACKUP_FILE="$1"
DB_USER="${DB_USER:-pamplia}"
DB_NAME="${DB_NAME:-pamplia_dev}"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "restore error: backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "[restore] restoring ${BACKUP_FILE} into ${DB_NAME}"
echo "[restore] this will overwrite existing DB objects"

cat "${BACKUP_FILE}" | docker compose exec -T db pg_restore \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -

echo "[restore] done"
