#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./ops/backup_db.sh
# Optional env vars:
#   DB_USER=pamplia DB_NAME=pamplia_dev KEEP_LAST=14 BACKUP_DIR=/home/opc/backups/pamplia

DB_USER="${DB_USER:-pamplia}"
DB_NAME="${DB_NAME:-pamplia_dev}"
KEEP_LAST="${KEEP_LAST:-14}"
BACKUP_DIR="${BACKUP_DIR:-/home/opc/temp_pamplia/backups/pamplia}"

mkdir -p "${BACKUP_DIR}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="${BACKUP_DIR}/pamplia_${DB_NAME}_${STAMP}.dump"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

echo "[backup] creating ${BACKUP_FILE}"

docker compose exec -T db pg_dump -U "${DB_USER}" -d "${DB_NAME}" -Fc > "${BACKUP_FILE}"
sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"

echo "[backup] checksum written to ${CHECKSUM_FILE}"

# Retention cleanup for old backups.
mapfile -t old_backups < <(ls -1t "${BACKUP_DIR}"/pamplia_"${DB_NAME}"_*.dump 2>/dev/null | tail -n +$((KEEP_LAST + 1)) || true)
if [[ "${#old_backups[@]}" -gt 0 ]]; then
  echo "[backup] removing ${#old_backups[@]} old backups"
  for file in "${old_backups[@]}"; do
    rm -f "${file}" "${file}.sha256"
  done
fi

echo "[backup] done"
