# EzyGo mobile

Release 1 scope and operating-policy drafts are defined in the
[mobile product specification](../../docs/mobile-product-v1.md). Customer live-map
tracking is required at launch; target minimums are iOS 16.4 and Android 7 (API 24),
subject to native build and device validation.

Expo Router starter for a future customer/driver application. This currently
renders a welcome screen; native sign-in, bookings, payments, location and push
workflows are not implemented yet. Existing features remain in the web/PWA app.

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

`lib/api.ts` creates an `@ezygo/api-client` instance for the backend. When adding
native authentication, supply an OS secure-storage token reader and a cleanup
callback for unauthorized sessions; follow
[the authentication contract](../../docs/mobile-authentication.md).
Mobile code must never import PostgreSQL, server services, or web application
source files. Put reusable transport types in `@ezygo/contracts`.

Store icons and splash artwork in `assets/` when those assets are ready.
