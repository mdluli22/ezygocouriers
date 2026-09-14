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

Sessions have a seven-day rolling lifetime. Better Auth may extend the expiry after a day of activity. The mobile client must treat the `expires_at` value returned by the server as authoritative and replace the stored token whenever a token-bearing response is received, even when its value appears unchanged.

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

## Suggested Client Lifecycle

1. Read the token from secure storage during app startup.
2. If no token exists, show registration or login.
3. Call the session endpoint with the token.
4. On success, update the local user and expiry state and enter the role-appropriate application area.
5. Attach the Bearer header through one central HTTP client interceptor.
6. Renew shortly before expiry and atomically save the returned token data.
7. On `401`, clear credentials and return to login. On `403`, keep the session but deny that operation.
8. On logout, request server revocation and clear credentials locally.

Google OAuth is not part of this initial native token flow. It remains available to the web/PWA client. Native Google sign-in should be added later using an authorization-code flow with PKCE and verified app deep links rather than embedding the web cookie flow in a WebView.
