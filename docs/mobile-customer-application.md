# Phase 4 customer application

The Expo customer stack provides dashboard, delivery booking, delivery detail,
payment and profile screens behind the existing authentication/session gate.
Email/password registration, OTP and Google sign-in remain shared with Phase 3.
The customer stack remains mounted but hidden while the session is locked, so a
background/foreground session check does not discard an in-progress booking.
Signing out removes customer state.

## Transport and booking

All builds default to `https://ezygocouriers.co.za`; set `EXPO_PUBLIC_API_URL`
to override the backend origin. Email and Google sign-in share the same resolved origin.
Release builds reject HTTP. The typed client supplies signed bearer credentials,
rejects redirects and external request paths, normalizes failures, and aborts
after 15 seconds. Mutations are not retried automatically.

`POST /api/places` proxies Google Places API (New). Configure the **server-only**
`GOOGLE_PLACES_API_KEY`, enable Places API (New) and restrict the key to the
server's permitted APIs and egress IPs. No Google server key is shipped in the
mobile bundle. Search is debounced, uses per-search session tokens and restricts
predictions to the Cape Town bounds. Place details and booking input both pass
`addressSchema`, including the existing Cape Town name and coordinate checks.
The Google Maps attribution is shown alongside suggestions.

The form uses native inputs, switches and buttons. Its three stages are route
and contacts, parcel options, and review. Handover options, access notes, parcel
size/category, fragile handling and delivery PIN are included. Validation uses
`createDeliveryRequestSchema` on both client and server.

`POST /api/deliveries` creates the quote, delivery and payment attempt through the
existing services. The payment page displays the authoritative price before
opening checkout. If submission has an uncertain result, the form directs the
customer to the dashboard instead of silently creating a duplicate. Confirmed
deliveries with no payment attempt can resume through `/api/payments/create`.

## Payment return and verification

Paystack opens with Expo WebBrowser's secure browser session, never an embedded
WebView. Only `https://checkout.paystack.com` checkout URLs are accepted.
New mobile checkouts include a server-signed return token in the provider callback.
The signature binds delivery ID, checkout reference and a 24-hour expiry. After
provider verification, the callback returns to `ezygo://payment-return?token=…`.
The app parses that exact route; `/api/payments/verify` then validates the signature,
current checkout reference, authenticated customer ownership, and provider
transaction amount, currency, reference and test/live mode before confirming.
The link is a signed custom-scheme return, not an OS-verified HTTPS Universal Link.
No link parameter is accepted as evidence that payment succeeded.

Verification is bounded to twelve checks five seconds apart, pauses while the
session is locked, and supports explicit retry. Browser dismissal leaves the
payment unconfirmed until the backend says `complete`. Returning after app
termination is supported by Expo Router; signing in and opening the delivery
also recovers payment status. A checkout originally created on the website keeps
its web callback; closing its browser returns to the app's verification screen.

Set `BETTER_AUTH_SECRET` and the existing Paystack server configuration before
using checkout. The deployed callback origin must be reachable by Paystack.

## Release verification

Run `npm run typecheck`, `npm test`, `npm run test:mobile`, and
`API_TEST_DATABASE_URL=postgresql://…/disposable_test npm run test:api`.
The database must be disposable and its name must end in `_test`.
Run `npm run export --workspace @ezygo/mobile` to bundle iOS and Android.

Native development builds are still required to verify keyboard layout,
VoiceOver/TalkBack, background restoration and real Paystack test checkout on
both platforms. Expo Go is not sufficient for custom-scheme return validation.
Exercise browser dismissal, callback/webhook ordering, expired/tampered links,
network loss after booking submit, cancellation, and pull-to-refresh on device.

References: [Expo WebBrowser](https://docs.expo.dev/versions/latest/sdk/webbrowser/),
[Google Places Autocomplete](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete).
