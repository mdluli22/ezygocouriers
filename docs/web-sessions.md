# Web cookies and sessions

Web authentication uses Better Auth and the existing `auth_sessions` database table. No new migration or secret is required.

- Email login accepts `rememberMe` (boolean). The web forms default to false; omitted values retain the existing true default for API consumers. False creates a browser-session cookie; true creates a seven-day persistent cookie. Browser session restore can preserve session cookies, so users should sign out on shared devices.
- Cookies use the `ezygo` prefix, HttpOnly, SameSite=Lax, and Path=/. Production uses Secure cookies and requires HTTPS. `BETTER_AUTH_COOKIE_DOMAIN` optionally shares cookies with trusted subdomains; otherwise cookies remain host-only.
- Persistent sessions renew after a day when visiting a protected or authentication page. The proxy forwards every returned Set-Cookie header on both pass-through responses and redirects. Rendering-time session reads disable refresh because they cannot deliver cookies.
- Session validation reads the database, with cookie caching disabled. Existing active-account, verified-email, driver-status, and production-account checks remain in place.
- POST `/api/auth/logout` revokes the current session and clears its cookies through Better Auth. Google sign-in and email verification retain Better Auth’s existing persistent-session behavior.
- These are essential authentication cookies. No analytics or advertising cookies are introduced.

Verification: `node --test scripts/test-web-sessions.cjs`, `npx tsc --noEmit`, and `npm run typecheck:contracts`.
