import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, RateLimitError } from "./rate-limit";

/** Covers both custom web/mobile auth routes and the raw Better Auth router. */
export async function guardAuthRequest(request: NextRequest): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname;
  if (request.method !== "POST" || !/^\/api\/(auth|mobile\/v1\/auth)\//.test(path)) return null;
  // Registration must use the validated application routes, including mandatory phone.
  if (/^\/api\/auth\/sign-up\/email\/?$/.test(path)) {
    return NextResponse.json({ message: "Use the EzyGo signup endpoint." }, { status: 404 });
  }
  if (/\/(logout|sign-out|refresh|session)$/.test(path)) return null;
  try {
    // Trust only a header overwritten by your ingress, never arbitrary forwarded chains.
    const ip = process.env.TRUST_PROXY_IP === "true" ? request.headers.get("x-real-ip") || "unknown" : "unknown";
    await consumeRateLimit(`auth-network:${ip}`, 100, 60);
    const reader = request.clone().body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (reader) {
      while (true) {
        const {done,value} = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 16384) {
          void reader.cancel();
          return NextResponse.json({ message: "Request too large." }, { status: 413 });
        }
        chunks.push(value);
      }
    }
    const text = Buffer.concat(chunks).toString("utf8");
    let email = "unknown";
    try { const body = JSON.parse(text); if (typeof body.email === "string") email = body.email.trim().toLowerCase().slice(0, 320); } catch { /* Route validates JSON. */ }
    const sends = /signup|send-verification|request-password-reset|forget-password/.test(path);
    const category = sends ? "send" : /verify/.test(path) ? "verify" : "login";
    await consumeRateLimit(`auth:${category}:${email}`, sends ? 5 : 10, sends ? 300 : 60);
    return null;
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ message: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfter), "Cache-Control": "no-store" } });
    console.error("Authentication limiter unavailable");
    return NextResponse.json({ message: "Sign-in is temporarily unavailable." }, { status: 503 });
  }
}
