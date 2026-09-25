# Phase 5 driver application

Driver accounts route to `/driver` after a server-verified session restoration.
The driver stack rejects customer/admin accounts, and every driver endpoint still
checks server-side role and assignment ownership. Assignments refresh on focus,
every 15 seconds while visible, and on pull-to-refresh. Current trips prioritize
picked-up/in-transit work, then an assigned trip. History uses terminal statuses.

Trip detail shows pickup/destination contacts, address notes, parcel instructions,
fragile/PIN requirements and status history. Phone/SMS links open the device app;
map handoff opens Apple Maps or the Android geo handler. Drivers confirm each
status action using the shared transition rules. The UI offers pickup, transit,
delivery and failure; cancellation/reassignment remains a dispatch concern.
Notes and the recipient's six-digit PIN use native controls. Nothing is marked
complete until the backend accepts it.

## Offline delivery updates

An encrypted SecureStore outbox is scoped to the authenticated driver. Each action
gets an immutable UUID. Status and receipt commit in one PostgreSQL transaction,
so a lost response can be retried without repeating a status log, email or PIN
handover. Reusing an ID for different input returns 409. New operations still
validate the active driver, assignment, transition and PIN. No PIN is logged or
returned by the server; receipt payload digests are keyed HMACs.

Only one unconfirmed action per trip and eight total actions are permitted.
Queued updates are visible and retained for up to 24 hours. Retrying network/5xx
failures uses bounded exponential backoff and honors Retry-After. Permanent
rejections, including wrong PIN, are blocked for driver review and lose their
stored PIN immediately. Re-enter rejected work with a new operation ID after
refreshing the trip. Signing out stops sharing and clears the driver's outbox.
There is no unauthenticated offline access after session restoration fails;
saved work resumes when the same driver verifies their session again.

Location keeps only the newest unsent point, discards readings older than 60
seconds, rejects accuracy worse than 100 metres, and does not persist route
history. Server capture-time checks reject stale/future points and ignore
out-of-order retries. Mobile locations are scoped to an assigned active trip;
they do not trigger optional pre-trip automatic dispatch. Terminal status updates
clear the stored driver point. Stop-sharing requests clear older server points
without erasing points from a newer sharing session. An offline stop takes effect
locally immediately and is retried when that driver reconnects.

## Tracking consent and builds

Foreground sharing is off by default and starts only after the driver reads the
explanation and grants OS permission. Background sharing is a separate choice,
available after foreground sharing, with its own explanation and OS permission.
The app config enables iOS location background mode and Android's visible
foreground service notification. A module-scope TaskManager callback reads the
secure session, revalidates identity and sends only authorized trip points.

Sharing ends on explicit stop, sign-out, terminal trip action, permission loss,
confirmed reassignment, or 12-hour consent expiry. The app does not silently
restart a foreground watcher after process termination. Background callbacks
check expiry and assignment at the backend. OS throttling/force termination can
prevent callbacks; do not interpret enabled permission as guaranteed GPS delivery.
The initial moving capture target is 15 seconds/25 metres; platform scheduling
and automatic pausing apply.

Expo Go supports foreground testing. Background task execution requires a native
development or release build containing the new location plugin configuration.
See [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/) and
[TaskManager](https://docs.expo.dev/versions/latest/sdk/task-manager/).
Customer live-map presentation and operational driver availability remain separate
work; this phase must not be described as a complete customer live-tracking release.

## Backend setup and verification

Apply `scripts/sql/014_driver_mobile_operations.sql` before using mobile status
changes or the updated location endpoint. It adds the receipt table and accuracy
column. Docker Compose's migration service now includes it. Keep the auth signing
secret configured; operation receipts do not store PINs in plaintext.

Run `npm run typecheck`, `npm run test:mobile`, `npm test`, and
`API_TEST_DATABASE_URL=postgresql://…/disposable_test npm run test:api`.
Build bundles with `npm run export --workspace @ezygo/mobile`.
Integration tests cover concurrent/lost-response retries, modified IDs, PIN
failure, ownership, location ordering, terminal trips and stop/restart ordering.

Before release, test on physical iOS/Android development builds: denied/revoked
permissions, screen lock, app termination, airplane mode before/after status
submission, reconnect, sign-out/account switch, inaccurate GPS, background expiry,
and battery saver. Verify a queued PIN handover remains pending until backend
confirmation and that GPS stops after consent withdrawal. Bundle exports and
unit/integration tests cannot establish native background reliability.
