# EzyGo Mobile Experience Rollout

For the native release now being defined, see the
[release 1 product specification](mobile-product-v1.md). It requires customer
live-map tracking at launch. The PWA implementation and earlier Expo decision
criteria below describe the existing baseline; they do not replace that scope.

EzyGo is shipping the responsive customer experience as a Progressive Web App first. The current Next.js UI, PostgreSQL services, Paystack checkout, mobile Bearer authentication and `@ezygo/contracts` package remain the source of truth. Expo is a later client, not a second backend.

## Delivery status

### 4. Customer booking, payment and tracking

Implemented in the responsive PWA:

- a three-step Cape Town booking flow with shared server/client validation;
- secure Paystack hosted checkout with verified callback and webhook paths;
- a customer delivery list and status-history tracking page;
- recipient PIN delivery when a PIN handover is requested;
- customer push alerts for driver status changes;
- a visible offline state that prevents duplicate booking and payment attempts.

Booking and payment requests are intentionally not added to an offline replay queue. Retrying an ambiguous request could create a duplicate delivery or payment. Customers keep the current screen state and submit again after connectivity returns.

### 5. Driver assignments, status and location

Implemented in the responsive driver portal:

- active and historical assignment lists with trip details;
- server-enforced status transitions (`assigned` → `picked_up` → `in_transit` → `delivered`);
- optional notes, cancellation controls and six-digit handover PIN verification;
- automatic assignment by recent driver proximity, with a fair fallback queue;
- explicit **Share location** and **Stop sharing** controls;
- visible location permission, sync and offline-queue state;
- push alerts that deep-link to a newly assigned trip.

PWA location is foreground-oriented. Browsers may suspend JavaScript after the app is backgrounded or the device locks. EzyGo must not describe this as continuous background tracking.

### 6. Push, live-location controls and offline retry

Implemented:

- standards-based Web Push subscriptions tied to the authenticated user and device;
- service-worker notification display and same-origin deep links;
- automatic cleanup of expired push endpoints;
- user-initiated notification permission (never an automatic permission prompt);
- last-write-wins offline retry for one recent driver location only;
- automatic rejection of queued locations older than 15 minutes;
- connection banners in customer and driver portals;
- online-only booking, payment and delivery status mutations.

No delivery, address, contact, PIN or payment data is stored in Cache Storage. The location outbox stores only the most recent coordinates and capture time in IndexedDB, and deletes the record after sync or expiry.

## Deployment steps

1. Apply `scripts/sql/010_push_subscriptions.sql` to every existing database.
2. Generate a VAPID key pair once:

   ```bash
   npx web-push generate-vapid-keys
   ```

3. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` in the deployment secret store. The subject should be a monitored `mailto:` address or HTTPS URL.
4. Deploy over HTTPS. Push, service workers and production geolocation require a secure context.
5. Confirm `/sw.js` is served from the site root without a redirect.
6. Sign in on a real device, install the PWA, select **Alerts off** to opt in, and select **Share location** in the driver portal.
7. Send a test assignment and status change, verifying the notification opens the correct trip.

To apply the migration with the local Docker database:

```bash
docker compose exec -T db sh -c 'psql -U "$DB_USER" -d "$DB_NAME"' \
  < scripts/sql/010_push_subscriptions.sql
```

## Security release gate

Complete these checks in staging before production approval:

- verify customer, driver and admin role isolation for every API route;
- confirm a driver cannot read or mutate another driver's delivery;
- confirm transition validation and PIN verification remain server-side;
- confirm Paystack signatures, amount, currency, reference and mode are verified before fulfilment;
- test duplicate Paystack callbacks and webhooks for idempotency;
- verify push subscription endpoints are never returned by an API or written to logs;
- rotate test secrets and confirm no real credentials are committed;
- test sign-out invalidation for cookie and Bearer sessions;
- verify cached storage contains no authenticated HTML, API response or personal data;
- test notification and location denial, revocation and re-enablement;
- run dependency audit, type checking, targeted linting and a production build;
- test rate limits at the CDN/gateway for authentication, delivery creation, payment creation, location and push-subscription routes.

The app adds `nosniff`, strict referrer handling, clickjacking protection, restrictive camera/microphone permissions and same-origin geolocation permissions. Production infrastructure should add request throttling and retain HTTPS/HSTS at the edge.

## Device test matrix

| Journey | iPhone Safari/PWA | Android Chrome/PWA | Desktop Chrome/Edge |
| --- | --- | --- | --- |
| Install and launch | Required | Required | Required |
| Email + Google sign-in | Required | Required | Required |
| Book Cape Town delivery | Required | Required | Smoke |
| Paystack return/cancel | Required | Required | Required |
| Status tracking refresh | Required | Required | Required |
| Push opt-in and deep link | Required (supported OS) | Required | Required |
| Location allow/deny/stop | Driver device | Driver device | Smoke |
| Offline banner/recovery | Required | Required | Required |
| Location offline retry | Driver device | Driver device | Smoke |
| 320 px width + large text | Required | Required | Required |

Also test poor connectivity, screen rotation, safe-area insets, keyboard overlap, permission revocation, expired sessions and returning from hosted checkout.

## Expo decision and app-store preparation

Move the driver client to Expo when the business requires reliable background GPS after the screen locks, native background tasks, stronger notification delivery guarantees, or store-managed distribution. Those capabilities cannot be guaranteed by a PWA.

An Expo Router starter now lives in `apps/mobile`; native authentication, delivery
workflows, background location, notifications, and store release are still future
implementation work. Before expanding that starter into the production app:

1. Confirm the PWA metrics show a real need: missed assignments, stale driver location or installation friction.
2. Reuse `@ezygo/contracts` for models, Zod schemas and constants.
3. Use the existing mobile Bearer login/session/logout endpoints and OS secure storage for tokens.
4. Keep Paystack in a system browser or verified web-auth session and process the same server callback/webhook.
5. Add Expo Location with clear foreground/background consent, an always-visible in-app stop control and a privacy-policy disclosure.
6. Add Expo Notifications while retaining the existing server notification abstraction; store Expo tokens separately from Web Push subscriptions.
7. Prepare distinct customer and driver store roles only if product ownership requires separate apps; otherwise use role-based navigation in one binary.
8. Produce 1024×1024 icons, splash assets, screenshots, support URL, privacy URL, account-deletion instructions and store privacy declarations.
9. Run TestFlight and Play closed testing before review submission.

Do not submit the current PWA package directly to Apple App Store or Google Play. App-store delivery is a separate Expo (or carefully evaluated Trusted Web Activity) workstream.
