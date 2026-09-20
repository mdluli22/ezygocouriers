# Backend preparation — operations and verification

Phase 2 adds shared contracts, request tracing, database-backed abuse protection,
checkout reuse and PostgreSQL integration tests. It does not implement Phase 1's
trip-scoped live-location backend, background GPS, native push or native payment
return. Those remain separate implementation work.

## Enable in an environment

1. Apply `scripts/sql/011_api_rate_limits.sql` and
   `scripts/sql/012_payment_checkout_reuse.sql` and
   `scripts/sql/013_mobile_oauth_and_session_revocation.sql` before deploying this code.
   Both are idempotent. Docker Compose's migration service includes them.
2. Set a strong `API_RATE_LIMIT_SECRET`, or use the existing `BETTER_AUTH_SECRET`
   fallback. All replicas must share the same secret and database. Rotation
   starts fresh buckets. Missing configuration/store fails closed with `503` on
   protected endpoints; it does not fall back to per-process memory.
3. Configure `API_TRUSTED_IP_HEADER` only for a header overwritten by trusted
   ingress. The supplied Nginx configuration overwrites `X-Real-IP` with
   `$remote_addr`; `x-real-ip` is suitable when that is also true for the main
   host and the origin port remains private. If a CDN sits in front, configure
   Nginx's trusted real-IP sources first. Do not trust arbitrary forwarded chains.
   When unset/invalid, requests share an `unidentified` network bucket, which
   prevents spoofing but can throttle unrelated users. Configure ingress before
   a public rollout.
4. Ingress should enforce connection/body-read timeouts and maximum body sizes as
   well. The application checks actual streamed bytes, not just Content-Length:
   32 KiB for ordinary requests, 256 KiB for payment notifications, 10 seconds to
   read a body. Provider signature validation uses the original bytes.
5. Periodically purge expired buckets (for example, hourly):
   `DELETE FROM api_rate_limits WHERE expires_at < NOW();`
   Buckets expire logically without the purge; this bounds storage. Keys are
   HMACs rather than raw email addresses, IPs or user IDs. Choose a maintenance
   scheduler in deployment; no external schedule is created by this change.

No production migration, configuration change or deployment has been performed
as part of the local implementation.

## Limits

Limits are atomic fixed windows shared across replicas. Both network and account
limits must pass. Failed requests count too; changing mobile/browser aliases or
IP addresses does not reset the account bucket.

| Operation | Network limit | Account limit | Window |
| --- | ---: | ---: | --- |
| Email login (web/native/Better Auth) | 30 | 10 per normalized email | 5 minutes |
| Signup, OTP send, password reset request | 10 | 5 per normalized email | 10 minutes |
| OTP verification | 30 | 10 per normalized email | 10 minutes |
| Other authentication mutations | 60 | 20 per email, when supplied | 1 minute |
| Authentication/session reads | 240 | — | 1 minute |
| Booking/checkout/sandbox confirmation | 60 | 10 per authenticated user | 1 minute |
| Driver location | 240 | 30 per authenticated user | 1 minute |
| Driver status | 120 | 20 per authenticated user | 1 minute |
| Completion/PIN attempts | Above status limits | 5 per driver and delivery | 10 minutes |
| Paystack browser return | 60 | — | 1 minute |
| Provider payment notifications | 300 | — | 1 minute |

Completion limits include non-PIN trips and invalid transitions to avoid leaking
PIN state through the limiter. Better Auth's existing limits and five-attempt
OTP verification protection remain in place too. Tune network limits for shared
NAT fleets and provider retry volume after staging measurements; rate-limited
provider notifications receive `429` and must retry.

All `429` responses include `Retry-After` in seconds. The shared client exposes
it but does not retry payments, bookings or status changes automatically.

## Request IDs and logs

Every wrapped route generates a UUID and returns `X-Request-ID`; EzyGo JSON
responses also include `request_id`. Incoming request IDs are ignored. Logs are
JSON with a timestamp, event, request ID, route template, method, status and
duration where applicable. SQL logs record duration/row count without SQL or
parameters. Exception messages, stacks, bodies, query strings, authorization,
PINs and coordinates are not serialized by the application logger. Search using
the request ID supplied by the customer. Database timings outside HTTP work have
no request ID. Infrastructure and third-party library logging need separate
configuration; this logger does not globally intercept other loggers.

## Tests

From the repository root, run:

```bash
npm test
npm run typecheck
API_TEST_DATABASE_URL=postgres://ezygo_test:ezygo_test_only@127.0.0.1:55439/ezygo_api_test npm run test:api
```

Use a disposable PostgreSQL 16 database whose name ends in `_test`. The suite
refuses to run without an explicit test URL. Each run creates a unique schema,
applies all numbered migrations, seeds test accounts and removes only that
schema afterward. It never loads root environment files. Authentication,
password/PIN hashing, SQL authorization filters, locks and transaction handling
are real. A test loader provides the Next request-header context and substitutes
an email collector; payment-provider network responses are stubbed in payment
cases. No real emails or charges are sent. These are handler/service integration
tests, not an externally deployed HTTP or provider-sandbox end-to-end test.

Coverage includes customer ownership/role separation; driver assignment and
suspension; transition/PIN checks; safe response projection; concurrent
webhook/callback fulfillment; signed payment amount/currency/mode checks;
concurrent hosted-checkout reuse; OTP registration and session revocation;
cross-alias limits, expiry and store outage; payload limits; correlation/log
redaction; and inventory coverage of every exported method. CI now supplies
PostgreSQL and runs this suite alongside client tests, builds and type checks.

## Compatibility and known boundaries

- Keep application-owned existing paths at v1; mobile authentication uses
  `/api/mobile/v1/auth`. See [API contracts](api-contracts.md) and the
  [endpoint inventory](api-inventory.md).
- Security corrections remove accidental PIN-hash exposure and reject invalid
  roles/assignments. They do not preserve unauthorized behavior as compatibility.
- Repeated verified payment notifications create one financial completion and
  one paid transition. Notification delivery remains best effort, not an
  exactly-once email guarantee.
- Checkout reuse covers successful persisted initialization, including concurrent
  requests. Provider success followed by a timeout/crash before database commit
  remains ambiguous and needs provider reconciliation before another attempt.
  No provider-wide exactly-once claim is made.
- Booking creation is not an offline/idempotent replay endpoint. Reload bookings
  after uncertain outcomes. Cancellation does not automatically refund money.
- Existing location updates still store driver-level coordinates, not authorized
  customer live tracking. This phase protects that endpoint; the Phase 1 live-map
  requirements still need implementation.
