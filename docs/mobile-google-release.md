# Mobile Google sign-in release

Adds the native Google OAuth endpoints to the existing production application without changing its directory layout or replacing production payment/security code.

The app starts at POST /api/mobile/v1/auth/google, opens the returned browser URL, and returns to ezygo://auth/callback with a short-lived code. The exchange requires the matching state and PKCE verifier. Session credentials remain encrypted in the database and never appear in a URL. Existing mobile-session checks continue to enforce account and driver eligibility.

Deployment uses the existing main-branch GitHub Actions workflow, including its pre-migration backup and readiness checks. Migration 018 adds the isolated mobile_oauth_flows table and expiry index. Existing Google web OAuth credentials and BETTER_AUTH_SECRET are reused. BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL must be the public HTTPS origin. Keep the existing Google authorized redirect URI /api/auth/callback/google.

After deployment, verify malformed start/exchange requests return JSON validation errors and invalid browser request IDs return JSON errors instead of HTML 404s. Complete Google login on a native build, check cancellation/retry, and verify an exchanged code cannot be replayed. Expired handoffs can be removed with DELETE FROM mobile_oauth_flows WHERE expires_at < NOW().
