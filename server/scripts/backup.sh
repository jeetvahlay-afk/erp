#!/usr/bin/env sh
set -eu

: "${MONGO_URI:?MONGO_URI is required}"
BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DESTINATION="${BACKUP_ROOT%/}/teamhub-${STAMP}"

mkdir -p "$DESTINATION"
mongodump --uri="$MONGO_URI" --gzip --out="$DESTINATION"

echo "Backup created: $DESTINATION"
