# Main into staging — October 15, 2026

This merge imports production main (f162e9b) into the staging monorepo. Production web files are located under apps/web. Native app, shared client, installations, duty, location, and operations extensions stay on staging. The Google handoff uses the implementation released in PR #3. Production account and driver eligibility rules also apply to bearer sessions.

The incoming production backend uses Yoco. Native booking and checkout requests now select Yoco; payment verification can read Yoco records and waits for the signed provider webhook to settle them. Legacy Paystack verification is retained for existing records.

Validation includes workspace lint/types, API-client and native unit tests, production web release tests, a web build, and release smoke checks. Database-backed staging API and restore tests still require a disposable PostgreSQL/Docker runtime. Before a mobile production release, reconcile native delivery response expectations with the incoming paginated web API, verify Yoco return-to-app behavior on a device, and complete booking, payment, tracking, driver mutation/retry, and notification checks.

Only pushes to main trigger the production deployment. This sync does not merge staging into main. Keep the native production release separate until those checks are complete.
