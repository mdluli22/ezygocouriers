#!/bin/sh
# Run from the release directory. Files contain private data: copy encrypted off-host.
set -eu
umask 077
backup_dir=${1:?Usage: scripts/backup-database.sh /absolute/backup-directory}
mkdir -p "$backup_dir"
backup_file="$backup_dir/ezygo-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose exec -T db sh -ec 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > "$backup_file.partial"
test -s "$backup_file.partial"
mv "$backup_file.partial" "$backup_file"
printf '%s\n' "$backup_file"
