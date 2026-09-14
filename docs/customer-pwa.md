# EzyGo Customer PWA

The customer experience is delivered as a responsive Progressive Web App before investing in a separate Expo application. It uses the existing customer pages, cookie authentication, API contracts, and payment flow while adding home-screen installation and a safe offline state.

## Included PWA Capabilities

- installable manifest with EzyGo name, colours, icon, and customer shortcuts;
- standalone display from the customer dashboard;
- home-screen metadata for Android, iOS, and iPadOS;
- customer dashboard install prompt on browsers that support `beforeinstallprompt`;
- service-worker registration in production;
- an offline fallback that does not expose cached customer, delivery, or payment data;
- static asset caching for versioned JavaScript, CSS, fonts, and public images.

The service worker deliberately does not cache `/api/*`, authenticated HTML pages, payment callbacks, delivery state, or user data. Live network access remains required to book, pay for, or refresh a delivery.

## Installation

### Android and desktop Chromium

Open EzyGo over HTTPS and sign in. Use the in-app **Install EzyGo** prompt or the browser’s install option.

### iPhone and iPad

Open EzyGo in Safari, select **Share**, choose **Add to Home Screen**, and confirm. Apple devices do not expose the Chromium `beforeinstallprompt` event, so the browser’s Share menu is the installation path.

## Deployment Requirements

1. Deploy over HTTPS. Localhost is the only non-HTTPS development exception supported by service workers.
2. Confirm `/manifest.webmanifest` returns `200` with `application/manifest+json` or another valid manifest content type.
3. Confirm `/sw.js` returns `200`, is not redirected, and has `Service-Worker-Allowed: /`.
4. Keep `/EzyGoIcon.png` publicly accessible.
5. When changing cached public assets or offline behavior, increment `STATIC_CACHE` in `public/sw.js` so old caches are removed during activation.
6. Test installation and offline fallback against the production build rather than `next dev`; service-worker registration is intentionally disabled in development.

## Verification Checklist

- Open the customer site in a supported browser and inspect the application manifest.
- Confirm the app name is **EzyGo Couriers**, its start URL is `/dashboard`, and standalone display is selected.
- Confirm the service worker controls the page after the first load.
- Install the app and verify the customer dashboard opens in a standalone window.
- Disable the network and reload a customer route; the non-sensitive offline screen should appear.
- Re-enable the network and select **Try again**.
- Confirm API responses and authenticated pages are absent from Cache Storage.
- Deploy an updated service worker with a new cache version and confirm the previous `ezygo-static-*` cache is deleted.

## When Expo Becomes Worthwhile

Continue with the PWA while installation, booking, tracking, hosted payments, and foreground location behavior meet customer needs. Consider an Expo client when product requirements depend on capabilities such as stronger push-notification delivery, deeper background processing, app-store distribution, richer native sharing, or device integrations that are unreliable in installed web apps.

Expo can reuse `@ezygo/contracts` and the versioned mobile Bearer-session endpoints without changing the server contract.
