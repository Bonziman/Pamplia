# Ops Setup

This folder contains practical scripts to keep Pamplia reliable in production.

## Scripts

- `backup_db.sh`: creates a PostgreSQL backup from the `db` container.
- `restore_db.sh`: restores a backup into the configured DB.
- `healthcheck.sh`: checks backend, frontend, and DB connectivity.

## Quick Use

From repo root (`/home/opc/temp_pamplia`):

```bash
chmod +x ops/*.sh
./ops/healthcheck.sh
./ops/backup_db.sh
```

## Backup Location

By default backups are stored in:

`/home/opc/temp_pamplia/backups/pamplia`

Override with env vars if needed:

```bash
BACKUP_DIR=/path/to/backups DB_NAME=pamplia_dev DB_USER=pamplia ./ops/backup_db.sh
```

## Restore Example

```bash
./ops/restore_db.sh /home/opc/backups/pamplia/pamplia_pamplia_dev_YYYYMMDDTHHMMSSZ.dump
```

## Cron (Daily backup at 03:15 UTC)

Edit crontab:

```bash
crontab -e
```

Add:

```cron
15 3 * * * cd /home/opc/temp_pamplia && /home/opc/temp_pamplia/ops/backup_db.sh >> /home/opc/temp_pamplia/backups/pamplia/backup.log 2>&1
```

## Recommended Routine

- Run `healthcheck.sh` after each deploy.
- Keep at least 14 backups (`KEEP_LAST=14` default).
- Test restore at least once per month.
