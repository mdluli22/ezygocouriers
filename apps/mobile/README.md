# EzyGo mobile

Release 1 scope and operating-policy drafts are defined in the
[mobile product specification](../../docs/mobile-product-v1.md). Customer live-map
tracking is required at launch; target minimums are iOS 16.4 and Android 7 (API 24),
subject to native build and device validation.

Expo Router customer/driver app with email/password registration and sign-in, OTP
verification, Google browser sign-in, secure session restoration, and logout.
Customer booking, payment verification, dashboard, history, cancellation and profile
screens are implemented. See [Phase 4 setup and release verification](../../docs/mobile-customer-application.md).
Driver assignments, trip actions, consent-based foreground/background location and
encrypted offline queues are implemented in [Phase 5](../../docs/mobile-driver-application.md).
Customer live-map display and push work remain separate phases.

Run `npm ci` at the repository root, then `npm run dev:mobile`.
Use the Expo terminal controls to open iOS or Android. Native simulator/device
tooling is required separately. Run `npm run export --workspace @ezygo/mobile`
to verify both JavaScript bundles without building native binaries.

## API configuration

Email and Google sign-in both default to `https://ezygocouriers.co.za`,
including development builds. No mobile environment file is required.

To use a different backend, copy `.env.example` to `.env.local` in this directory
and set `EXPO_PUBLIC_API_URL` to its origin, with no `/api` suffix:

- iOS simulator: `http://localhost:3000`.
- Android emulator: `http://10.0.2.2:3000`.
- Physical device: your development machine's LAN address and port 3000.
- Production: your deployed HTTPS origin.

Restart Expo after changing environment configuration. All `EXPO_PUBLIC_*`
values are public. Never copy the repository root environment files here.

`lib/auth/session-controller.ts` owns authentication and authenticated requests;
use its `request()` method for protected APIs. Credentials and pending OAuth PKCE
state use Expo SecureStore only. See [the authentication contract](../../docs/mobile-authentication.md).

Use a native development build to test Google OAuth and `ezygo://` links; Expo Go
is not a substitute for the registered native scheme. Bundle/package identifier:
`za.co.ezygocouriers.app`. Run `npm run test:mobile` at the repository root.
Mobile code must never import PostgreSQL, server services, or web application
source files. Put reusable transport types in `@ezygo/contracts`.

Store icons and splash artwork in `assets/` when those assets are ready.

## Diagnosing sign-in failures

Run `npm run check:mobile-api -- https://ezygocouriers.co.za` from the repository
root (or pass your local backend origin). This sends no credentials and starts no
Google flows. All three checks must pass; an HTML 404 for Google means the
connected deployment is missing the mobile Google route or its proxy is not
routing it correctly. Deploy the current web app and its migrations before
retrying; a mobile app reload alone cannot add a missing server endpoint.

`customer@ezygo.co.za` / `Customer@1234` is a **local test account** from
`scripts/sql/seed_test_customer.sql`, not a guaranteed production account.
Use it only against a local database where that seed was explicitly applied.
Do not seed or reset shared demo credentials on production to work around login.
Google sign-in also requires a native development build with the registered
`ezygo://` scheme; Expo Go cannot complete that return flow.

Phase 6 push, duty controls, background tracking policy and customer map setup: [native operations](../../docs/mobile-native-operations.md).
