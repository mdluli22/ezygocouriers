import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, createApiClient } from "../src/index.ts";

const success = () => Response.json({ success: true, message: "OK", data: { id: 1 } });

test("browser requests preserve cookies and JSON options", async () => {
  const client = createApiClient({ fetch: async (url, init) => {
    assert.equal(url, "/api/auth/logout");
    assert.equal(init.credentials, "same-origin");
    assert.equal(init.headers.get("Authorization"), null);
    assert.equal(init.headers.get("Content-Type"), "application/json");
    assert.equal(init.method, "POST");
    return success();
  } });
  assert.equal((await client.request("/api/auth/logout", { method: "POST", body: "{}" })).data.id, 1);
});

test("native requests read the current token and never follow redirects", async () => {
  let token = "first";
  const client = createApiClient({ baseUrl: "https://api.example.com/", credentials: "omit", getAccessToken: async () => token,
    fetch: async (url, init) => {
      assert.equal(url, "https://api.example.com/api/mobile/v1/auth/session");
      assert.equal(init.headers.get("Authorization"), `Bearer ${token}`);
      assert.equal(init.credentials, "omit");
      assert.equal(init.redirect, "error");
      return success();
    } });
  await client.request("/api/mobile/v1/auth/session");
  token = "renewed";
  await client.request("/api/mobile/v1/auth/session");
});

test("rejects external request targets before reading credentials", async () => {
  const client = createApiClient({ getAccessToken: () => assert.fail("Must not read token") });
  for (const path of ["https://other.example/api/", "//other.example/api/", "/api/\\other.example"]) {
    await assert.rejects(client.request(path), /must use a \/api\//);
  }
});

test("401 invokes credential cleanup and preserves structured API errors", async () => {
  let cleared = false;
  const client = createApiClient({ onUnauthorized: () => { cleared = true; }, fetch: async () => Response.json({ success: false, message: "Expired", code: "UNAUTHORIZED", errors: null }, { status: 401 }) });
  await assert.rejects(client.request("/api/mobile/v1/auth/session"), (error) => error instanceof ApiError && error.status === 401 && error.code === "UNAUTHORIZED");
  assert.equal(cleared, true);
});

test("non-JSON failures do not expose server HTML", async () => {
  const client = createApiClient({ fetch: async () => new Response("<html>upstream error</html>", { status: 502 }) });
  await assert.rejects(client.request("/api/deliveries"), (error) => error instanceof ApiError && error.status === 502 && !error.message.includes("<html>"));
});

test("rate-limit errors preserve request ID and retry delay without replaying a mutation", async () => {
  let calls = 0;
  const client = createApiClient({ fetch: async () => {
    calls++;
    return Response.json({ success: false, message: "Slow down", code: "RATE_LIMITED", errors: null, request_id: "request-123" }, { status: 429, headers: { "X-Request-ID": "request-123", "Retry-After": "42" } });
  } });
  await assert.rejects(client.request("/api/payments/create", { method: "POST", body: "{}" }), error => error instanceof ApiError && error.requestId === "request-123" && error.retryAfter === 42 && error.code === "RATE_LIMITED");
  assert.equal(calls, 1);
});

test("timeout aborts an in-flight mutation and does not replay it", async () => {
  let calls = 0;
  const client = createApiClient({ timeoutMs: 5, fetch: async (_url, init) => {
    calls++;
    return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));
  } });
  await assert.rejects(client.request("/api/deliveries", { method: "POST", body: "{}" }), error => error instanceof ApiError && error.status === 0 && /timed out/.test(error.message));
  assert.equal(calls, 1);
});
test("connection failures have the same normalized error shape", async () => {
  const client = createApiClient({ fetch: async () => { throw new TypeError("fetch failed secret upstream details"); } });
  await assert.rejects(client.request("/api/deliveries"), error => error instanceof ApiError && error.status === 0 && !error.message.includes("secret"));
});

test("missing deployed routes report unavailable features without exposing HTML", async () => {
  const client = createApiClient({ fetch: async () => new Response('<html>not found with internal details</html>', { status: 404, headers: { 'Content-Type': 'text/html', 'X-Request-ID': 'missing-google' } }) });
  await assert.rejects(client.request('/api/mobile/v1/auth/google', { method: 'POST', body: '{}' }), error => error instanceof ApiError && error.status === 404 && error.code === 'SERVICE_UNAVAILABLE' && error.requestId === 'missing-google' && /server may need an update/.test(error.message) && !error.message.includes('internal details'));
});
test("JSON authentication rejections preserve their actual cause", async () => {
  const client = createApiClient({ fetch: async () => Response.json({ success: false, code: 'UNAUTHORIZED', message: 'Invalid email or password.', errors: null }, { status: 401 }) });
  await assert.rejects(client.request('/api/mobile/v1/auth/login', { method: 'POST', body: '{}' }), error => error instanceof ApiError && error.status === 401 && error.message === 'Invalid email or password.');
});
