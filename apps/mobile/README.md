# EzyGo mobile

Release 1 scope and operating-policy drafts are defined in the
[mobile product specification](../../docs/mobile-product-v1.md). Customer live-map
tracking is required at launch; target minimums are iOS 16.4 and Android 7 (API 24),
subject to native build and device validation.

Expo Router customer/driver app with email/password registration and sign-in, OTP
verification, Google browser sign-in, secure session restoration, and logout.
Bookings, payments, location and push screens are subsequent phases.

Run `npm ci` at the repository root, then `npm run dev:mobile`.
Use the Expo terminal controls to open iOS or Android. Native simulator/device
tooling is required separately. Run `npm run export --workspace @ezygo/mobile`
to verify both JavaScript bundles without building native binaries.

## API configuration

Copy `.env.example` to `.env.local` in this directory and set
`EXPO_PUBLIC_API_URL` to the backend origin, with no `/api` suffix:

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
