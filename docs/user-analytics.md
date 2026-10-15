# Admin user analytics

The admin overview includes registered accounts, email verification, enabled accounts, registrations today and over the last 7/30 days, a 14-day registration chart, and a customer/driver/admin breakdown. Today and chart dates use Africa/Johannesburg; 7/30-day metrics are rolling windows. Counts include all stored accounts, including disabled accounts.

Live users are distinct signed-in users with a visible customer, driver or admin workspace that sent a heartbeat in the last two minutes. Anonymous visitors and native app activity are not counted. Heartbeats run once a minute while the browser is visible and online. Multiple tabs and sessions count once per user; expired sessions, disabled/unverified accounts and inactive drivers are excluded. Deleting an auth session cascades to its presence record. Presence stores a session ID and database timestamp only.

Analytics refresh every 30 seconds while the admin page is visible. Failed refreshes retain the last successful values with a message. The analytics API is admin-only; presence derives identity from the validated session and rejects cross-site browser calls.

Apply `scripts/sql/017_user_analytics.sql` before serving the updated app. Compose includes it in the migration job. For the configured environment, run `node scripts/apply-user-analytics.cjs`. The migration is additive and idempotent.

Validation: `node --test scripts/test-user-analytics.cjs` checks API permissions and presence identity. `node scripts/test-user-analytics-db.cjs` verifies deduplication, heartbeat expiry, account restrictions, rolling registrations, empty trends, migration idempotency and session deletion in a temporary PostgreSQL schema rolled back after testing.
