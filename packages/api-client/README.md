# @ezygo/api-client

Shared fetch-based JSON transport for EzyGo's application API envelopes.
It has no database, React, Next.js, or native storage dependency.

```ts
import { createApiClient } from "@ezygo/api-client";
import type { MobileSessionData } from "@ezygo/contracts";

const browserApi = createApiClient(); // Same-origin cookie authentication.

const mobileApi = createApiClient({
  baseUrl: "https://ezygocouriers.co.za",
  credentials: "omit",
  getAccessToken: readTokenFromSecureStorage,
  onUnauthorized: clearSecurelyStoredToken,
});
const { data } = await mobileApi.request<MobileSessionData>(
  "/api/mobile/v1/auth/session",
);
```

The secure-storage functions in this example are supplied by the native app.
Tokens are read for each request and never persisted by this package. Use HTTPS
for production origins. Redirects are rejected and request targets must start
with `/api/`. The generic type describes expected data; it does not validate
endpoint-specific data at runtime.

Use `JSON.stringify(payload)` for JSON bodies. The client sets the JSON content
type for string bodies; explicitly set another content type if needed.
`ApiError` exposes HTTP status, API error code, and field errors. Network failures
remain native fetch errors; requests are never automatically retried. Better Auth
endpoints with different response formats should use Better Auth's own client.
