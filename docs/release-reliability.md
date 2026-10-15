# Release checks and recovery

`npm run build` uses Webpack explicitly. Turbopack failed in this workstation environment; Webpack passes. Google font downloads still require network access during a cold build. CI uses the Node version in `.nvmrc`, `npm ci`, strict lint (zero warnings), application/contracts type checks, regression tests, a production dependency audit, the production build, HTTP smoke tests, and an isolated PostgreSQL restore drill. Deployment depends on that job and verifies the release commit.

## Health and database isolation

- `/api/health/live` confirms the HTTP process is alive.
- `/api/health/ready` checks database connectivity and the pricing, auth-session, and notification-outbox tables. It returns 503 without internal details on failure. This is database readiness, not a guarantee that SMTP, maps, or Yoco are available.
- Production Compose publishes only the app on `127.0.0.1:3000`. PostgreSQL and migrations use an internal Docker network; the app also has an outbound network for providers. The local override exposes PostgreSQL on loopback only.
- Remote database TLS validates certificates. Set `DB_SSL=true` and optionally `DB_SSL_CA` to the trusted PEM certificate (literal newlines or escaped `\n`). Do not use an unverified certificate connection.
- Migration `014_list_pagination.sql` adds owner/status indexes for bounded lists. The migration service applies it to existing installations.

## Backups and restoration

Run `sh scripts/backup-database.sh /absolute/private/backup-directory` from the release directory. It creates a PostgreSQL custom-format archive with owner/ACL information excluded and restrictive file permissions. A failed dump is left as `.partial`; it is never promoted to a completed archive. Copy completed archives to encrypted off-host storage with a retention policy and restricted access. Local archives alone do not cover host loss.

`npm run test:restore` creates an isolated PostgreSQL 16 container with no published ports, applies all migrations, verifies that production bootstrap has no test users, inserts synthetic linked customer/address/quote/delivery/payment/session rows, dumps, restores into another database, and compares every table's row count and content hash. It also compares the full schema against an independently restored schema-only archive and verifies sequence continuation. PostgreSQL canonicalizes some constraint expressions on restore, so comparing raw pre-restore SQL text is not sufficient.

The drill removes only its own disposable container and volume. Evidence is saved in `deliverables/restore-drill.json` and uploaded by CI. The evidence proves the repository's synthetic restore procedure; it does not verify an existing production backup or off-host backup service.

To review a real archive without touching a running database:

```sh
docker run -d --name ezygo-restore-review --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine
# Wait until this succeeds (TCP readiness avoids the temporary bootstrap server).
docker exec ezygo-restore-review pg_isready -h 127.0.0.1 -U postgres
docker exec ezygo-restore-review createdb -U postgres restored
docker exec -i ezygo-restore-review pg_restore -U postgres -d restored --exit-on-error --no-owner --no-acl < /absolute/path/to/backup.dump
```

Verify schema version, owner totals, payment totals, row counts against the backup-time reference, and an application read-only smoke test before planning a production restore. Preserve and secure the review container until validation is complete. Never restore directly over the live database as a routine check.

## Deployment failure

Deployment builds before replacing the application, waits for the database, takes a pre-migration backup, applies migrations, and polls readiness after starting the new application. If readiness fails, it retags/restarts the previous application image and verifies readiness, then fails the release. This rolls back application code only. Database migrations must remain backward compatible; database recovery is a separate operator procedure using a verified backup. The production rollback procedure has not been exercised on a hosted server by this change.
