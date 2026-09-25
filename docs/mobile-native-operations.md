# Phase 6: native operations

## Setup

Apply `scripts/sql/015_native_operations.sql` after migration 014. Existing drivers retain on-duty availability; drivers can now explicitly go off duty. Auto and manual assignment exclude off-duty drivers.

Set a random `OPERATIONS_WORKER_SECRET` on the web server and worker. Run `npm run worker:operations` locally (loads `.env.local`; set `OPERATIONS_API_URL=http://localhost:3001` for the local test backend), or `docker compose --profile operations up -d --build` in deployment. Run one or more workers; a PostgreSQL advisory lock prevents concurrent processing. The worker calls the authenticated internal endpoint every minute. It is required for notifications and expiry cleanup. Monitor process health and jobs with eight exhausted attempts or failed status.

For the mobile development/release build, configure `EXPO_PUBLIC_EAS_PROJECT_ID`, APNs/FCM credentials in EAS, and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` for Android Maps SDK (restrict to Android package and signing certificate). iOS uses Apple Maps. Optionally configure Expo's enhanced push security and matching server-only `EXPO_ACCESS_TOKEN`. Rebuild after native configuration changes. Never bundle backend worker or Expo access secrets.

Expo Go supports the customer map and foreground flow. Remote push and background tracking require a physical device with a development/release build. Real APNs/FCM delivery, terminated-app notification navigation, background execution and battery use need device acceptance testing; exports alone do not verify them. See [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) and [map configuration](https://docs.expo.dev/versions/latest/sdk/map-view/).

## Notifications

Customer profile and driver assignments provide enable/disable controls. Each installation has a SecureStore UUID and 256-bit removal secret; the backend stores only the secret hash and binds the token to the authenticated session. Token rotation is handled. Session deletion removes registrations. Offline removal is persisted and retried on app activation; a notification already accepted by a push provider cannot be recalled.

Delivery database triggers atomically enqueue customer payment-required, payment-confirmed, driver-assigned, pickup, completed and failed events, plus driver assignment events. Failed/cancelled payment attempts enqueue action-required events. Clients never supply notification text or recipients. The worker submits generic lock-screen messages, stores Expo ticket IDs, checks receipts, and retires DeviceNotRegistered tokens. Retries are bounded; external delivery is at least once, so a process failure between provider acceptance and ticket persistence may cause a duplicate. Events/jobs expire after 24 hours; they are not an audit log. New installations do not receive earlier events.

Taps use a delivery ID and role, never an arbitrary URL. The app fetches the delivery through the authorised endpoint before navigating. Old or unauthorised notifications grant no access.

## Location and duty

Sharing requires an active assigned trip, active authenticated driver, on-duty state and explicit foreground/background consent. Consent expires after 12 hours. The OS indicator/foreground notification and trip sharing panel expose tracking. Off duty and sign-out stop native tracking immediately; off-duty changes and removal requests retry when connectivity returns. Cross-device duty changes are checked on the foreground runtime; background uploads are rejected by the backend when duty/session/trip policy fails. Offline server revocation cannot be instantaneous, and the customer's last point expires within five minutes.

Balanced location accuracy, 25-metre movement filtering, foreground upload intervals of 15 seconds moving/60 seconds stationary, and 60-second background batching reduce power use. These are requested intervals; the OS controls actual delivery. No GPS point older than 60 seconds or more than 10 seconds in the future is accepted. Cape Town bounds, accuracy limit and a generous 55m/s plus 200m jump allowance reject implausible readings without penalising typical GPS jitter. This is plausibility filtering, not proof against GPS spoofing.

Only the latest point is stored, bound to its trip and auth session; no route history is retained. Terminal transitions, reassignment, sign-out and off-duty clear it immediately. The minute worker clears expired points after five minutes and expired sessions. Removing the worker delays physical expiry cleanup, but the read endpoint still suppresses expired data.

## Customer map

`GET /api/deliveries/:id/location` is customer-only and ownership checked (other customers receive 404). It returns only pickup/destination coordinates and the permitted latest driver point, accuracy, capture timestamp, stale flag and server time. It requires the matching active assignment, active driver/user, valid originating session and on-duty state. No driver point is returned before assignment, after completion/failure/cancellation, or after five minutes. Points older than one minute are labelled stale. The map polls every 15 seconds while focused and foregrounded and clears driver data on failed reads, backgrounding or session changes. It does not request customer location permission.

## Validation

Integration tests cover installation ownership/removal, private location access, stale/expired points, duty rejection, implausible movement, terminal cleanup, event deduplication and Expo ticket/receipt cleanup with a mocked provider. Existing auth, booking, payments, driver transitions, PIN and outbox suites remain regression coverage. Complete physical-device acceptance before releasing.
