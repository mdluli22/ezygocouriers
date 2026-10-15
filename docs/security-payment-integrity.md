# Security and payment integrity release

Implemented 11 October 2026 for the first two workstreams in the web/mobile audit.

## Behaviour

- Development account seeds live in `scripts/dev-seeds`, outside PostgreSQL's automatic initialization directory. Fresh production databases contain no default admin. Provision a unique administrator explicitly.
- Production login and application-session checks reject known historical seed password hashes, including previously issued sessions. Development mode continues to support local fixtures. Driver deactivation revokes sessions; inactive/suspended drivers cannot use the business APIs.
- Authentication limits are shared in PostgreSQL across the web, mobile and raw auth routes. Login allows ten attempts per account per minute; verification-code sending allows five per five minutes. An additional network limit applies. The raw email signup route is disabled; use the application's validated signup API.
- Delivery responses explicitly enumerate public columns. PIN hashes, booking hashes and internal job payloads are never returned. Wrong-PIN attempts and PIN resends are limited.
- Push destinations are restricted to known providers, resolved to public IPv4 addresses and pinned to that address for the TLS request. Keys and device counts are validated.
- Booking is idempotent per customer and UUID request key. Reusing a key with changed details returns 409. Quotes, addresses and the delivery commit together. Confirmation locks/rechecks the delivery and rejects expired quotes.
- Manual and automatic assignment require settled payment and an active, verified, available driver. Manual assignment cannot move an in-transit job backwards and records the admin actor. Driver fulfilment also requires payment.
- Pending checkout attempts preserve their provider mapping and reuse the saved checkout. Provider calls have timeouts. Signed webhook metadata can recover a mapping lost after provider acceptance.
- Verified late or additional payments enter the payment-review queue rather than reviving cancelled deliveries or being discarded. Paid cancellations also create a review. Replayed callbacks are idempotent.
- `/admin/payments` lists payment reviews and notification failures. A completed refund requires a provider reference and a resolution note. The application records refunds performed with the provider; it does **not** automatically transfer/refund money. Every review resolution has an actor and audit record.
- Delivery tracking shows payment-review/refund status and allows the customer to request a new recipient PIN. Drivers cannot request that PIN. An authorised resend invalidates the old PIN.
- PIN, completion-email and configured push jobs are durable. PIN/email payloads are encrypted in the database; successful sends erase the payload. A failed send retries with backoff, then moves to a failed state after eight attempts for admin recovery. SMTP success means the provider accepted the email, not that it reached the inbox.

## Deploy safely

1. Back up the target database and confirm the intended environment. Run `node scripts/audit-seeded-accounts.cjs` **against that environment**. It is read-only and prints no passwords or hashes. The configured database audit found four active accounts with known seed hashes; this is not a claim about an independently inspected production server.
2. Before production rollout, rotate the affected administrator/other account credentials through the interactive command `node scripts/rotate-seeded-password.cjs USER_ID`, or retire those test identities using your approved account-management process. The command only changes accounts still using known fixture hashes, hides input and revokes their sessions. Do not paste passwords into chat, shell arguments or source files. Provision a unique admin first if retiring the last administrator.
3. Apply `scripts/sql/013_security_payment_integrity.sql` before serving the new application. `node scripts/apply-security-integrity.cjs` applies this migration to the configured environment. It was applied to the configured database during implementation. The Docker migration service includes it automatically. The migration is additive and queues historical completed payments on cancelled deliveries for review; it does not issue refunds.
4. Keep `BETTER_AUTH_SECRET` (or the existing `JWT_SECRET` fallback) strong and stable. The outbox derives its encryption key from it unless `NOTIFICATION_ENCRYPTION_KEY` is set. A dedicated secret of at least 32 characters is recommended. Do not rotate the encryption source while jobs are pending without draining/re-encrypting them: old ciphertext will not decrypt with the new key.
5. The long-running Docker app sets `ENABLE_NOTIFICATION_WORKER=true`. Its instrumentation hook polls every 15 seconds. PostgreSQL leases allow multiple instances, recover abandoned work after five minutes, and avoid concurrent claims. Local development leaves this worker off unless explicitly enabled. A serverless deployment needs a dedicated long-running worker instead of relying on an in-process interval.
6. Set `TRUST_PROXY_IP=true` only when the application port is private and every ingress overwrites `X-Real-IP`. Otherwise the limiter intentionally uses one conservative shared network bucket, with independent per-account limits. Never trust caller-supplied forwarded-IP chains. The repository's admin Nginx template overwrites this header; confirm the main-site ingress as well.
7. Verify SMTP, HTTPS, payment webhook configuration and outbound access for the actual deployment. Exercise a sandbox payment/cancel/PIN flow there. No live provider transaction or email was sent during these implementation tests.

Notification delivery is **at least once**. If a process fails after SMTP accepts a message but before the database records success, the message may be sent again. Retries retain the same PIN; they do not invalidate an earlier successful delivery. User-requested resend intentionally rotates it.

## Client/API changes

- `POST /api/deliveries` requires an `Idempotency-Key` header containing a UUID. Missing/invalid keys return 428. Keep that key unchanged for retries of the same payload; use a new key for a genuinely new booking. The web booking form persists only the key and payload digest in session storage, scoped to the customer.
- If that booking is already paid, the response contains `data.redirect_url` pointing to tracking instead of issuing another checkout. The updated web client handles either this redirect or `data.payment.redirect_url`.
- Native/mobile clients must adopt this header and replay behaviour before using the changed booking endpoint. Editable native source is not present in this checkout, so the native client could not be updated here.
- `GET /api/deliveries/:id/recovery` returns only the owning customer's (or admin's) review summary and PIN job status. `POST` requests recipient PIN rotation/resend for a paid active PIN delivery. This sends to the stored recipient, never to the requesting driver's device.
- `GET/PATCH /api/admin/payments` requires an administrator. Reviews transition once from pending to refunded/resolved. Retrying failed notifications does not expose their encrypted payload.
- Auth limits return 429 with `Retry-After`; if the shared limiter is unavailable, authentication returns 503 rather than proceeding without protection.

## Verification

- `node --test scripts/test-security-integrity.cjs scripts/test-driver-earnings.cjs scripts/test-yoco-checkout.cjs`
- `node scripts/test-service-worker.mjs`
- `node scripts/test-security-integrity-db.cjs` creates and removes a private disposable schema; it uses real PostgreSQL transactions/concurrency and stubbed external providers.
- `npx tsc --noEmit`, targeted ESLint on changed application code, `npm run build`, and `npm audit --omit=dev`.

The default Turbopack production build now succeeds after upgrading Next.js and its ESLint configuration to 16.4.0. Production dependency audit reports zero vulnerabilities. Sharp 0.35.5 and source-map-js 1.2.2 are explicitly overridden to patched versions; brace-expansion updates stay within each consumer's compatible major.

The full development-tool audit still reports five high entries stemming from `braces@3.0.3` through Next's ESLint plugin. The registry's latest braces version is still 3.0.3; npm's proposed forced resolution downgrades the framework lint configuration to an incompatible older major. This was not forced. It is development tooling, not in the production dependency audit; track its upstream fix and run lint only on trusted source patterns.

Live local HTTP smoke testing confirmed ten 401 login failures followed by a 429 within approximately three seconds, a 404 for raw signup, and denial of anonymous access to payment reviews and PIN recovery.

No hosted deployment or bank transfer was performed. Earlier audit workstreams outside these two, including password-reset UI, general pagination and broader visual/accessibility cleanup, remain separate.
