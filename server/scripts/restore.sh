#!/usr/bin/env sh
set -eu

: "${MONGO_URI:?MONGO_URI is required}"
: "${1:?Usage: ./scripts/restore.sh <backup-directory>}"

BACKUP_DIRECTORY="$1"
if [ ! -d "$BACKUP_DIRECTORY" ]; then
  echo "Backup directory not found: $BACKUP_DIRECTORY" >&2
  exit 1
fi

if [ "${CONFIRM_RESTORE:-}" != "RESTORE_TEAMHUB" ]; then
  echo "Set CONFIRM_RESTORE=RESTORE_TEAMHUB to acknowledge destructive restore behavior." >&2
  exit 1
fi

mongorestore --uri="$MONGO_URI" --gzip --drop "$BACKUP_DIRECTORY"
echo "Restore completed from: $BACKUP_DIRECTORY"
