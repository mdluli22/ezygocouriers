# EzyGo Mobile Authentication

The mobile API uses a signed, opaque Better Auth session token. It is not a JWT and contains no user claims. Every authenticated request is checked against the server-side `auth_sessions` table, so logout, expiry, account suspension, and session revocation take effect on the server.

The existing web and PWA authentication flow is unchanged: browsers continue to use secure HttpOnly session cookies. Mobile clients use the versioned `/api/mobile/v1/auth` endpoints and send the resulting token in the `Authorization` header.

## Security Requirements

- Use HTTPS outside local development.
- Store `access_token` in iOS Keychain, Android Keystore-backed encrypted storage, or an equivalent OS credential store.
- Do not store it in AsyncStorage, local storage, a SQLite table, Redux persistence, logs, analytics, crash reports, URLs, or deep-link parameters.
- Keep the token in memory only while making requests.
- Never ship `BETTER_AUTH_SECRET`, database credentials, or provider secrets in the mobile application.
- Clear the stored token after logout or any authoritative `401` response.
- Do not enable wildcard CORS to support native clients. Native HTTP clients do not require browser CORS access.

All mobile authentication responses send `Cache-Control: no-store`, `Pragma: no-cache`, `Referrer-Policy: no-referrer`, and `Vary: Authorization`. Application JSON responses also include `X-EzyGo-API-Version: 1`.

## Session Lifetime

Sessions have a seven-day rolling lifetime. Better Auth may extend the expiry after a day of activity. The mobile client uses server-calculated `expires_in` with a monotonic clock and replaces the stored token whenever a token-bearing response is received, even when its value appears unchanged. `expires_at` is stored for metadata, not compared to the device calendar.

The token is a signed representation of the server-side session token. Unsigned raw database session tokens are rejected.

## Registration Flow

### 1. Create the account

`POST /api/mobile/v1/auth/signup`

```json
{
  "full_name": "Akhona Example",
  "email": "akhona@example.com",
  "phone": "+27821234567",
  "password": "Example1Password",
  "confirm_password": "Example1Password"
}
```

A successful `201` response has `requires_verification: true`. It does not contain a session token.

### 2. Verify the email address

`POST /api/mobile/v1/auth/verify-email`

```json
{
  "email": "akhona@example.com",
  "otp": "123456"
}
```

A valid code verifies the account, creates the session, and returns the token payload described below. Store the token securely before navigating into the authenticated application.

### 3. Request another code when needed

`POST /api/mobile/v1/auth/send-verification`

```json
{ "email": "akhona@example.com" }
```

The endpoint deliberately returns a generic success message when account state prevents sending. This reduces account-state disclosure. OTP sending and verification are rate-limited.

## Login

`POST /api/mobile/v1/auth/login`

```json
{
  "email": "akhona@example.com",
  "password": "Example1Password"
}
```

Successful login returns:

```json
{
  "success": true,
  "message": "Signed in successfully.",
  "data": {
    "access_token": "opaque-signed-session-token",
    "token_type": "Bearer",
    "expires_at": "2026-09-21T08:00:00.000Z",
    "expires_in": 604800,
    "user": {
      "id": 42,
      "full_name": "Akhona Example",
      "email": "akhona@example.com",
      "phone": "+27821234567",
      "role": "customer",
      "avatar_url": null
    }
  }
}
```

Unverified accounts receive `403`; invalid credentials receive `401`.

## Calling Protected APIs

Send the token on every protected request:

```http
Authorization: Bearer opaque-signed-session-token
```

For example:

```http
GET /api/deliveries HTTP/1.1
Host: ezygocouriers.co.za
Authorization: Bearer opaque-signed-session-token
Accept: application/json
```

The existing application endpoints use the same authorization and role rules for cookie and Bearer sessions. A customer token cannot access driver or administrator operations.

## Validate the Stored Session

Call `GET /api/mobile/v1/auth/session` when the app starts or returns from a long background period.

Successful data:

```json
{
  "expires_at": "2026-09-21T08:00:00.000Z",
  "user": {
    "id": 42,
    "full_name": "Akhona Example",
    "email": "akhona@example.com",
    "phone": "+27821234567",
    "role": "customer",
    "avatar_url": null
  }
}
```

If it returns `401`, delete the stored token and show login. Do not repeatedly retry or attempt renewal with a rejected token.

## Renew the Session

Call `POST /api/mobile/v1/auth/refresh` with the current Bearer token when the app becomes active and `expires_at` is approaching. A successful response returns the same shape as login. Atomically replace the stored token and expiry with the returned values.

This is rolling renewal of an opaque server-side session, not a separate long-lived refresh token. A revoked or expired token cannot be renewed.

## Logout

Call `POST /api/mobile/v1/auth/logout` with the current Bearer token. A successful request deletes the server-side session. Clear the locally stored token whether the server returns success or says the session is already unauthorized.

## Implemented Client Lifecycle

The native controller uses Expo SecureStore (Keychain / Keystore-backed storage),
with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` on iOS and Android backup exclusion.
No token or user profile is persisted in ordinary storage. Store failures block
private screens; there is no insecure fallback.

Startup and foreground transitions call `POST /refresh` before opening private
screens. Active sessions revalidate every 60 seconds. Server `expires_in` and a
monotonic timer determine renewal, independent of the device calendar. Network
failure retains the secure credential but locks private screens until successful
revalidation. Authoritative refresh 401/403 clears it. Ordinary resource 403 is a
permission denial; resource 401 clears only the matching session.

Logout clears local storage immediately and attempts remote revocation. Offline
logout explicitly reports that server revocation could not be confirmed; the
server session remains until expiry or administrative revocation. Late requests
cannot restore a session after logout or clear a replacement session.

## Google OAuth and email deep links

Approved iOS bundle ID / Android package: `za.co.ezygocouriers.app`.
Native scheme: `ezygo`. Use a native development/release build to validate it.

1. Native generates a random state and S256 PKCE verifier in SecureStore.
2. `POST /api/mobile/v1/auth/google` registers the challenge and returns a browser URL.
3. `/google/start` binds the flow to a random HttpOnly browser cookie and starts
   Better Auth Google OAuth in the system authentication browser.
4. Google returns to the existing HTTPS `/api/auth/callback/google`; Better Auth
   redirects to `/api/mobile/v1/auth/google/callback`.
5. The callback checks the browser binding and active verified session, then
   redirects to `ezygo://auth/callback?code=…&state=…`. The code expires in 60 seconds.
6. `/google/exchange` requires the original state and verifier, consumes the code
   atomically, rechecks eligibility, and returns the signed session over HTTPS.

Session credentials never appear in deep links. Temporary database handoffs are
AES-256-GCM encrypted using a key derived from the server auth secret. The browser
session cookie is cleared after handoff. The app rejects unexpected callback
origins, paths, duplicate fields, or token-bearing link parameters.

Email verification messages link to `/mobile/verify`, which opens
`ezygo://auth/verify`. The user enters their email and six-digit OTP. Neither the
OTP nor email address is placed in the link. A web sign-in fallback is provided.

## Deployment and verification

- Apply migrations through `013_mobile_oauth_and_session_revocation.sql` before
  deploying. Existing database volumes do not rerun Docker initialization SQL.
  The migration revokes sessions on suspension/unverification and rejects session
  insertion for ineligible accounts, including concurrent creation attempts.
- Set server `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the public HTTPS origin;
  configure `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and SMTP.
  Keep secrets out of mobile environment variables.
- Register `https://YOUR_ORIGIN/api/auth/callback/google` in the Google web OAuth
  client. The custom app scheme is an internal handoff, not Google's callback URL.
- Set mobile `EXPO_PUBLIC_API_URL` to the same public origin. Release builds require HTTPS.
- Periodically run `DELETE FROM mobile_oauth_flows WHERE expires_at < NOW()`.
- Automated checks: `npm run test:mobile`, disposable-database `npm run test:api`,
  `npm run typecheck`, and `npm run export --workspace @ezygo/mobile`.

Before release, verify on signed iOS/Android builds: cold/warm email links; Google
success/cancel and app termination during handoff; Keychain/Keystore after device
lock/restart; session expiry and administrative revocation; airplane-mode restore
and logout; and device dates ahead/behind the server. Automated tests cover the
controller and server behavior, but cannot certify OS integration or live Google
configuration. No simulator or live provider end-to-end verification was available
in this workspace during Phase 3.
