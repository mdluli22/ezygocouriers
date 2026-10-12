# EzyGo web and mobile application audit

Audit date: 9 October 2026. Scope: the current checkout at `/Users/akhona/ezygocouriers`, local web server, shared APIs, database integration tests, dependency advisories and deployment configuration.

## Assessment

The application has a useful working foundation: shared validation, server-side role checks, payment signature verification, transactional earnings records, a custom 404, device-driven theme selection and private-data exclusions from the service-worker cache. The routing integration and earnings tests pass.

**I would not approve an unrestricted production rollout yet.** The main blockers are test accounts in the production database bootstrap, PIN-hash disclosure, authentication throttling gaps, unsafe delivery-state changes and missing payment/notification recovery. These are more consequential than further visual changes.

This is a code and local-runtime audit, not a penetration-test certification or a claim that every bug has been found. Application code was not changed as part of this audit.

## What was verified

| Check | Result |
| --- | --- |
| TypeScript application check (`npx tsc --noEmit`) | Passed |
| Shared contracts type check | Passed |
| Earnings and Yoco tests | 16 passed |
| Service-worker tests | 3 passed |
| Earnings PostgreSQL integration | Passed using temporary tables: SAST boundaries, driver isolation, approvals, totals, paid-week locks and completion idempotency |
| Live Google Routes check | Passed over IPv4; public-landmark route returned 5,464 metres; no delivery records changed |
| Production dependency audit | Three affected packages: one critical and two high package-level ratings; applicability discussed below |
| Targeted application lint | Failed: four errors and two warnings |
| Default production build | Sandboxed attempt stalled; unrestricted Turbopack attempt failed with an internal task-cancellation panic |
| Webpack production build (`npm run build -- --webpack`) | Passed, including TypeScript and page generation |
| Public HTTP smoke checks | Home, customer login/signup, driver/admin login, About, Privacy, Cookies and Terms returned 200 |
| Password recovery | `/auth/forgot-password` returned 404; confirmed in the browser |
| Anonymous protected API checks | Admin earnings, driver earnings, deliveries and mobile session returned 401 |
| Synthetic response check | Driver detail service preserves `delivery_pin_hash` in its returned object |
| Synthetic signup check | Booking modal's phone-less signup payload fails the shared signup schema |
| Bounded concurrent login probe | Twelve simultaneous nonexistent-account requests exceeded the 25-second client timeout; no reliable rate-limit timing conclusion could be drawn from that probe |

The tests above are targeted checks, not authenticated end-to-end coverage of every screen. No real payments, email sends, customer deliveries or bank transfers were initiated.

## Prioritised findings

Priority: **P1** = resolve before broad production use; **P2** = fix in the next hardening release; **P3** = polish/maintainability. “Code-confirmed” means the relevant implementation was traced, without deliberately exploiting a live account.

### Security and access control

**1. P1: Production bootstrap automatically includes predictable test accounts. Code-confirmed configuration issue.**

[docker-compose.yml:34](/Users/akhona/ezygocouriers/docker-compose.yml:34) mounts the entire `scripts/sql` directory into PostgreSQL's initialization directory. That directory contains [seed_test_users.sql](/Users/akhona/ezygocouriers/scripts/sql/seed_test_users.sql) and [seed_test_customer.sql](/Users/akhona/ezygocouriers/scripts/sql/seed_test_customer.sql), including active, verified test identities and an admin. On a fresh volume, these scripts are eligible for automatic execution. Existing production account state was not inspected.

Move development seeds out of the production initialization path, make production administrator provisioning explicit, and audit/revoke any previously seeded production identities and sessions. Acceptance: initialize an empty production-like database and verify that no development users exist.

**2. P1: Delivery detail APIs disclose the recipient PIN hash. Confirmed with synthetic data and response tracing.**

[drivers.ts:73](/Users/akhona/ezygocouriers/lib/services/drivers.ts:73) selects `d.*` and returns the row unchanged apart from an earnings field. [The driver detail API:32](/Users/akhona/ezygocouriers/app/api/driver/deliveries/[id]/route.ts:32) serializes that result. The customer service also selects `d.*` at [deliveries.ts:348](/Users/akhona/ezygocouriers/lib/services/deliveries.ts:348). This exposes `delivery_pin_hash`, permitting offline guessing of a six-digit secret by someone allowed to view the delivery. Hashing does not make that disclosure harmless.

Use explicit response DTOs and SQL column lists. Keep PIN hashes entirely server-side. Add per-delivery attempt limits and backoff to [driver status updates](/Users/akhona/ezygocouriers/app/api/driver/status/route.ts); no such limit was found. Acceptance: assert that neither detail API returns secrets and repeated wrong PINs are throttled without changing delivery state.

**3. P1: Custom authentication endpoints bypass the configured HTTP rate limiter. Code-confirmed integration gap.**

[auth.ts:137](/Users/akhona/ezygocouriers/lib/auth/auth.ts:137) configures login/OTP limits, but [web login:19](/Users/akhona/ezygocouriers/app/api/auth/login/route.ts:19), [mobile login](/Users/akhona/ezygocouriers/app/api/mobile/v1/auth/login/route.ts) and mobile OTP routes call `auth.api` directly. In the installed Better Auth implementation, rate limiting runs in the HTTP router's `onRequest`; direct API dispatch does not go through that router. No equivalent application limiter was found. Twelve sequential nonexistent-account attempts returned 401 without 429, although that run alone is not a timed-window proof. Production edge throttling was not verified.

Apply a shared limiter to every custom login, signup, OTP, booking, payment and PIN endpoint, with account/IP keys and a shared store for multiple instances. Verify 429 responses inside the configured window and document trusted proxy/IP handling.

**4. P1: Push subscriptions accept arbitrary outbound endpoints. Code-confirmed unsafe data flow; exploitability not exercised.**

[delivery schema:104](/Users/akhona/ezygocouriers/packages/contracts/src/schemas/delivery.ts:104) accepts any valid URL. [push-notifications.ts:99](/Users/akhona/ezygocouriers/lib/services/push-notifications.ts:99) later passes the stored endpoint to `webPush.sendNotification`. An authenticated user can therefore supply a destination that the server will attempt to contact when a notification is triggered. This creates an SSRF risk when push is configured.

Require HTTPS and validated push-provider destinations, block private/loopback/link-local destinations including resolved addresses, and enforce outbound network restrictions. Validate key formats, cap subscriptions per user and add notification timeouts. Test only against controlled local fixtures.

**5. P1: Driver deactivation does not revoke operational access. Code-confirmed.**

[toggleDriverStatus](/Users/akhona/ezygocouriers/lib/services/admin.ts:198) changes `drivers.status`; session checks examine `users.is_active`. [updateDeliveryStatus](/Users/akhona/ezygocouriers/lib/services/drivers.ts:141) checks assignment ownership and transition validity but not the driver's active status. An inactive or suspended driver whose user remains active can continue updating existing assignments. Automatic dispatch checks active status, so the rules are inconsistent.

Define inactive versus suspended behaviour explicitly and enforce it centrally on driver mutations. Suspension should revoke/deny operational access; handle existing jobs through an admin reassignment flow. Test with an already-issued session.

**6. P2: The raw signup endpoint bypasses manual signup requirements. Code-confirmed.**

[The catch-all auth handler](/Users/akhona/ezygocouriers/app/api/auth/[...all]/route.ts) exposes Better Auth signup, while [auth.ts:96](/Users/akhona/ezygocouriers/lib/auth/auth.ts:96) declares phone optional. Mandatory phone normalization and the application's password rules exist only in the custom [signup schema](/Users/akhona/ezygocouriers/packages/contracts/src/schemas/auth.ts). Direct email signup therefore has different validation and bypasses the custom mail preflight.

Enforce required manual-registration fields in shared server hooks or disable the raw public signup route while retaining the controlled flow. Keep any intentional Google-signup exception explicit. Test all exposed signup entry points.

**7. P1: Patch the dependency advisories, with applicability checks. Scanner-confirmed affected versions.**

Installed Next.js is 16.3.5. `npm audit --omit=dev` reports affected `next`, `sharp` and `source-map-js`; the report's critical rating belongs to Next.js. The [Next.js maintainer advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) requires attacker-controlled SVG input in Node `ImageResponse`. No `next/og` or `ImageResponse` usage was found in the app, so this audit does **not** establish a reachable critical RCE. Other [Next.js image-optimization advisories](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4) also appear in the audit.

Upgrade to a supported patched release covering all reported ranges (the current scan identifies fixes through 16.3.8), align `eslint-config-next`, and refresh the affected transitive dependencies. Re-run the audit, build and integration tests. Do not treat package severity as proof that every advisory is exploitable here.

### Delivery, payments and earnings

**8. P1: Manual assignment bypasses payment and delivery-state rules. Code-confirmed.**

[admin.ts:91](/Users/akhona/ezygocouriers/lib/services/admin.ts:91) allows assignment for every status except delivered, failed and cancelled. A quoted/confirmed unpaid delivery can become assigned; an in-transit delivery can be moved backwards to assigned. The service also lacks active-driver and workload checks and does not use the automatic allocator's lock. The UI's active-driver filter is not a server-side guarantee.

Allow assignment only from authorised states after checking settled payment, driver eligibility and capacity in one transaction. Make exceptional reassignment a separate audited action with an actor and reason. Test unpaid, inactive-driver, in-transit and concurrent assignment cases.

**9. P1: Confirmation can overwrite a concurrent cancellation. Code-confirmed race.**

[deliveries.ts:176](/Users/akhona/ezygocouriers/lib/services/deliveries.ts:176) reads status before its transaction; the later update at line 193 has no expected-state condition or locked recheck. A cancellation between those steps can be overwritten with confirmed. `acceptQuote` also uses the global pool rather than the transaction client, so quote acceptance can commit independently.

Lock and validate inside the transaction, or use a conditional update with a checked row count. Pass the same client into quote operations. Add a concurrent confirm/cancel integration test and a forced-rollback test.

**10. P1: Paid cancellation and late payment have no complete reconciliation path. Code-confirmed gap.**

[The transition rules](/Users/akhona/ezygocouriers/packages/contracts/src/constants.ts:38) allow cancellation after paid/assigned. [cancelCustomerDelivery:269](/Users/akhona/ezygocouriers/lib/services/deliveries.ts:269) cancels only pending payment records. It does not create a refund request or a customer-visible refund state for completed payments. A still-open provider checkout can also succeed after local cancellation; completion rejects non-pending payments instead of recording a recoverable financial exception.

Implement cancellation/refund policy states, provider reconciliation and a durable manual-review queue. Show whether money is retained, refund requested or refunded. Record late verified payments even when fulfilment cannot proceed. Do not silently interpret a cancellation as a refund.

**11. P1: Failed recipient PIN emails can strand paid deliveries. Code-confirmed.**

[payments.ts:15](/Users/akhona/ezygocouriers/lib/services/payments.ts:15) catches email failure after committing payment. [The webhook:79](/Users/akhona/ezygocouriers/app/api/payments/yoco/webhook/route.ts:79) still returns 200. Recovery depends on another callback arriving; no durable retry worker or explicit PIN resend endpoint was found. The driver requires the PIN to finish the delivery.

Write notification jobs transactionally, retry with backoff, and expose an authorised resend/support action. Avoid regenerating the PIN on concurrent webhook retries while another email send is in flight. Test SMTP failure followed by recovery without a second payment event.

**12. P2: Retrying checkout temporarily erases its webhook lookup key. Code-confirmed failure window.**

[payments.ts:66](/Users/akhona/ezygocouriers/lib/services/payments.ts:66) clears `provider_checkout_id` on a pending-payment conflict before the provider request. If that request fails, an already-issued checkout no longer resolves in the webhook lookup. Yoco's idempotency key is a useful existing control, but it does not prevent this local mapping loss.

Preserve the existing checkout mapping until a replacement is safely persisted. Reuse valid pending checkouts and add provider-request timeouts plus reconciliation tests for network failures and simultaneous retries.

**13. P2: Booking is not idempotent, and quote writes are outside its transaction. Code-confirmed.**

[createDelivery](/Users/akhona/ezygocouriers/lib/services/deliveries.ts:30) inserts a new delivery for every request. If its response is lost, a retry can duplicate the booking. [generateQuote](/Users/akhona/ezygocouriers/lib/services/quotes.ts:16) inserts through the global pool, so a delivery rollback can leave an orphan quote. Quote expiry is stored but `acceptQuote` does not enforce it.

Use a customer-scoped request idempotency key, a transaction-scoped quote service and explicit quote-expiry/requote behaviour. Test response loss, duplicate submissions and mid-transaction failure.

**14. P2: Scheduled delivery is stored but not enforced by dispatch. Code-confirmed capability gap.**

The shared request schema accepts `scheduled_time` and [createDelivery](/Users/akhona/ezygocouriers/lib/services/deliveries.ts:134) stores it. [Automatic assignment](/Users/akhona/ezygocouriers/lib/services/driver-assignment.ts) has no scheduled-time eligibility condition. The Terms advertise scheduled deliveries, but the reviewed booking UI does not expose a corresponding scheduler.

Either implement delivery windows, operating hours, due-job dispatch and missed-window recovery, or remove the unsupported capability from the contract and product wording until it is ready.

### Customer experience and performance

**15. P2: Password recovery is a broken customer journey. Browser/HTTP-confirmed.**

[login/page.tsx:193](/Users/akhona/ezygocouriers/app/auth/login/page.tsx:193) links to an absent `/auth/forgot-password` page. The Better Auth configuration has no password-reset email callback. Implement request/reset pages, expiring single-use tokens, delivery error handling and throttling. Test expired tokens and session revocation after reset.

**16. P2: The booking authentication modal cannot submit a valid signup. Schema-confirmed.**

[Booking page:64](/Users/akhona/ezygocouriers/app/dashboard/deliveries/new/page.tsx:64) sends no phone field, which the shared schema requires. The modal can appear when a loaded booking page lacks a usable user, although normal unauthenticated navigation is redirected by the proxy. Reuse the canonical signup form or redirect while preserving the booking draft. Add dialog semantics, focus management and keyboard dismissal while consolidating it.

**17. P2: The tracking screen is a snapshot rather than continuously updated status. Code-confirmed.**

[tracking page:233](/Users/akhona/ezygocouriers/app/dashboard/tracking/[id]/page.tsx:233) fetches once for each delivery ID. It has no polling, event stream or visibility/focus refresh. A customer leaving it open will not automatically see the driver's next status. Web push does not update that React state. Add bounded polling or server events, offline recovery, last-updated time and a refresh control. Pause polling when hidden or terminal.

**18. P2: Admin network failures can leave controls stuck or show misleading empty data. Code-confirmed.**

[Admin deliveries:47](/Users/akhona/ezygocouriers/app/admin/deliveries/page.tsx:47) lacks `try/catch/finally`, response-status validation and stale-request protection. A failed fetch can leave loading/assignment state set; a 401 response can become an empty list. Similar loading patterns exist in users, drivers and pricing. Use a shared request-state pattern with retry, explicit session expiry, cancellation and authoritative error handling. Resolve the four lint errors rather than suppressing them blindly.

**19. P2: Delivery and admin lists are unbounded. Code-confirmed scaling risk.**

[Customer deliveries:309](/Users/akhona/ezygocouriers/lib/services/deliveries.ts:309), [driver deliveries](/Users/akhona/ezygocouriers/lib/services/drivers.ts:16) and [admin lists](/Users/akhona/ezygocouriers/lib/services/admin.ts:38) fetch full histories. Client filtering and repeated driver-nav requests increase payload and database work as the business grows. Add cursor pagination, server-side search/filtering, dedicated summary counts and verified indexes. Measure realistic datasets and p95 latency before selecting a load target.

**20. P2: Public price copy can disagree with the actual quote. Code-confirmed.**

[PricingSection:33](/Users/akhona/ezygocouriers/components/landing/PricingSection.tsx:33), the hero and dashboard hard-code R99. Admin pricing updates the database value used by [generateQuote](/Users/akhona/ezygocouriers/lib/services/quotes.ts:16). Changing that rate leaves advertising and checkout inconsistent. Read a shared published price/configuration and define cache invalidation.

**21. P3: Earlier visual/copy requirements are not fully applied. Source-confirmed remnants.**

Em dashes remain in admin deliveries/users/login; gradient grid backgrounds remain in auth/admin login layouts. Explanatory text remains beneath some admin/tracking titles. See [admin deliveries:162](/Users/akhona/ezygocouriers/app/admin/deliveries/page.tsx:162), [admin login:105](/Users/akhona/ezygocouriers/app/admin/login/page.tsx:105) and [auth layout:41](/Users/akhona/ezygocouriers/app/auth/layout.tsx:41). Some auth layout styling may be bypassed by the current layout switch, so visual reachability must be checked before changing it. Consolidate the visual system and review every role in both device themes.

### Release operations

**22. P1: The standard release build failed in this environment. Runtime-confirmed; root cause unresolved.**

`npm run build` failed with `TurbopackInternalError: ... EcmascriptModuleAsset ... ident was canceled`. Webpack passed. This does not prove production's Linux build also fails, but the default command is not verified here. Reproduce from a clean checkout with pinned Node/npm and the patched Next.js release. If necessary, explicitly adopt the verified Webpack build after CI validation; do not rely on an undocumented local workaround.

**23. P1/P2: Deployment lacks enforced quality gates and has unsafe database defaults. Configuration-confirmed.**

[deploy.yml](/Users/akhona/ezygocouriers/.github/workflows/deploy.yml) deploys on main pushes without lint, tests or dependency-audit gates. It checks the commit and stops on migration/build failure, which is good, but no app readiness check or rollback verification was found. [Compose:38](/Users/akhona/ezygocouriers/docker-compose.yml:38) publishes PostgreSQL on every host interface. Public reachability depends on the host firewall and was not tested. [DB configuration:9](/Users/akhona/ezygocouriers/lib/db/server.ts:9) disables certificate verification when DB SSL is enabled.

Remove the production DB port publication or bind it to loopback, validate remote database certificates, add CI gates and an app health/readiness probe, and verify backup restore plus deployment rollback. No claim is made that external backup/monitoring services are absent; their configuration was not available in this checkout.

## What is still needed for a production-grade courier service

These are capability/readiness gaps or verification work, not all software defects:

| Area | Needed next |
| --- | --- |
| Administrator security | MFA, least-privilege operational roles, explicit session revocation and an audit trail for assignment, driver/user changes and pricing. Earnings changes already have an audit mechanism; extend that discipline. |
| Financial operations | Refund workflow, payment reconciliation, receipts, failed-settlement review and bank-payment reconciliation. Weekly “mark paid” records an external payment; it does not transfer money automatically. Keep monthly bonuses separately visible as requested. |
| Dispatch and support | Driver availability/shift controls, acceptance timeout and reassignment, failed-delivery/return workflow, proof-of-delivery evidence appropriate to the service, and an incident/support queue with ownership. |
| Notifications | Durable outbox, retry/dead-letter handling, delivery visibility and recipient recovery for PIN failures. |
| Reliability | Monitored error rates and latency, structured/redacted logs, correlation IDs, provider timeout budgets, backup restore drills, incident runbooks and a staging environment. Release DB connections before waiting on notification/provider network calls. |
| Privacy/account lifecycle | Implement account-deletion initiation and appropriate retention/export processes. Legal-page text alone does not demonstrate that these workflows exist. Confirm the actual retention policy with the business. |
| Accessibility | Validate keyboard navigation, focus restoration, dialogs, labels, error announcements, contrast in both themes, 200% zoom and 320px reflow against WCAG 2.2 AA. Persistent field errors should remain available even when transient notices disappear. |
| Mobile/PWA | Real-device tests for installation, payment return, keyboard overlap, safe areas, permission denial/revocation, offline recovery, push deep links and expired sessions. Foreground PWA GPS is not verified continuous background tracking. |
| Product/SEO | Per-page metadata, canonical URLs, sitemap/robots strategy and a verified social preview; the global meta description and custom 404 already exist. Reconcile scheduled-delivery and live-tracking wording with shipped behaviour. |
| Documentation | `docs/mobile-experience-rollout.md` still describes Paystack while current checkout is Yoco. Update the release checklist and provider recovery instructions. |

Use [OWASP ASVS 5.0](https://owasp.org/projects/asvs) as the web security verification baseline, [OWASP MASVS](https://mas.owasp.org/MASVS/) for the native client, and [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for accessibility acceptance criteria. These are proposed verification targets, not certifications earned by this scan. Apple requires in-app account-deletion initiation for App Store apps supporting account creation; see [Apple's account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

## Native mobile audit limitation

`apps/mobile` contains tracked compiled Hermes bundles, Expo development artifacts and generated iOS files, but no editable app source, package manifest or app configuration was found there. The root workspace includes only `packages/*`. The user was asked where the mobile source lives.

Consequently, secure token storage, native navigation, dependency health, Android permissions, deep-link validation, offline persistence and actual background GPS could not be verified. The available iOS plist declares background location and automatic theme selection, but declarations do not establish correct runtime behaviour. Native builds, TestFlight/Play testing and device performance were not run. Restore or locate the complete source and reproducible build configuration before a mobile release review.

## Recommended implementation order

1. **Security containment:** separate test seeds, audit seeded production accounts, remove PIN hashes from responses, close custom auth throttling and push endpoint gaps, enforce driver suspension, patch dependencies.
2. **Money and state integrity:** transactional confirmation/assignment, idempotent booking and checkout, refund/late-payment reconciliation, notification outbox and PIN recovery.
3. **Release reliability:** fix the default build, clear lint, add CI/health gates, isolate the database and prove backup restoration.
4. **Customer completion:** password reset, consolidated signup, refreshed tracking, reliable error handling, consistent price display and paginated lists.
5. **Readiness evidence:** authenticated staging end-to-end tests, concurrency/load tests, accessibility review and real iOS/Android testing using the complete mobile source.

No production deployment, account revocation or application fix was performed by this audit. The findings describe the reviewed checkout; hosted firewall, TLS, backups, live payment configuration and production account state remain to be verified separately.
