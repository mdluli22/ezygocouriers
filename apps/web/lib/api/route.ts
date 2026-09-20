import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { apiContext, logEvent, logServerError } from "./context";
import { ApiProblem } from "./errors";
import { errorResponse } from "./response";
import { clientIdentity, consumeLimit, ratePolicy } from "./rate-limit";

async function limitedBody(request: NextRequest, maxBytes: number) {
  const length = Number(request.headers.get("content-length"));
  if (length > maxBytes) throw new ApiProblem("PAYLOAD_TOO_LARGE", "Request body is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 10000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut) throw new ApiProblem("BAD_REQUEST", "Request body timed out.", 408);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => undefined);
        throw new ApiProblem("PAYLOAD_TOO_LARGE", "Request body is too large.", 413);
      }
      chunks.push(value);
    }
    return new Uint8Array(Buffer.concat(chunks));
  } finally { clearTimeout(timeout); reader.releaseLock(); }
}

export function withApiRoute<Args extends unknown[]>(
  route: string,
  handler: (request: NextRequest, ...args: Args) => Promise<Response>,
) {
  return async (request: NextRequest, ...args: Args): Promise<Response> => {
    const requestId = randomUUID(); // Never trust caller-supplied correlation IDs.
    const started = Date.now();
    return apiContext.run({ requestId, route, method: request.method }, async () => {
      let response: Response;
      try {
        const path = route === "/api/auth/[...all]"
          ? decodeURIComponent(request.nextUrl.pathname).replace(/\/+$/, "")
          : route;
        const policy = ratePolicy(path, request.method);
        const enforce = async (identity: string, max?: number) => {
          let result;
          try { result = await consumeLimit(policy!, identity, max); }
          catch (error) {
            logServerError("api.rate_limit_unavailable", error);
            throw new ApiProblem("SERVICE_UNAVAILABLE", "Request protection is temporarily unavailable.", 503);
          }
          if (!result.allowed) {
            const denied = errorResponse("Too many requests. Please try again later.", undefined, 429, "RATE_LIMITED");
            denied.headers.set("Retry-After", String(result.retryAfter));
            return denied;
          }
        };
        let denied = policy ? await enforce(`ip:${clientIdentity(request.headers)}`) : undefined;
        let handlerRequest = request;
        if (!denied) {
          let rawBody = "";
          if (!["GET", "HEAD"].includes(request.method)) {
            const bytes = await limitedBody(request, path.includes("webhook") || path === "/api/payments/callback" ? 262144 : 32768);
            rawBody = Buffer.from(bytes).toString("utf8");
            // Consume once: avoid tee/clone stream lifetime issues, and preserve
            // original bytes for provider signature verification.
            handlerRequest = new NextRequest(request.url, {
              method: request.method, headers: request.headers,
              body: bytes, signal: request.signal,
            });
          }
          if (policy?.accountMax) {
            if (path.startsWith("/api/auth/") || path.startsWith("/api/mobile/v1/auth/")) {
              let email: unknown;
              try { email = JSON.parse(rawBody).email; } catch { /* Handler reports invalid JSON. */ }
              if (typeof email === "string" && email.length <= 320)
                denied = await enforce(`email:${email.trim().toLowerCase()}`, policy.accountMax);
            } else {
              const { getSession } = await import("@/lib/auth/session");
              const session = await getSession();
              if (session) denied = await enforce(`user:${session.userId}`, policy.accountMax);
              if (!denied && session?.role === "driver" && path === "/api/driver/status") {
                let body;
                try { body = JSON.parse(rawBody); } catch { /* Handler reports malformed JSON. */ }
                if (body?.status === "delivered" && Number.isSafeInteger(body.delivery_id) && body.delivery_id > 0) {
                  let attempt;
                  try {
                    attempt = await consumeLimit(
                      { name: "delivery-pin", max: 5, seconds: 600 },
                      `user:${session.userId}:delivery:${body.delivery_id}`,
                    );
                  } catch (error) {
                    logServerError("api.pin_limit_unavailable", error);
                    throw new ApiProblem("SERVICE_UNAVAILABLE", "Request protection is temporarily unavailable.", 503);
                  }
                  if (!attempt.allowed) {
                    denied = errorResponse("Too many handover attempts. Please try again later.", undefined, 429, "RATE_LIMITED");
                    denied.headers.set("Retry-After", String(attempt.retryAfter));
                  }
                }
              }
            }
          }
        }
        response = denied ?? await handler(handlerRequest, ...args);
      } catch (error) {
        if (error instanceof ApiProblem) response = errorResponse(error.message, undefined, error.status, error.code);
        else {
          logServerError("api.unhandled_error", error);
          response = errorResponse("Internal server error", undefined, 500);
        }
      }
      // Provider redirects may have immutable headers. Preserve their body,
      // status and cookie headers while adding transport metadata.
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("X-Request-ID", requestId);
      if (!responseHeaders.get("Cache-Control")?.includes("no-store")) responseHeaders.set("Cache-Control", "no-store");
      if (response.status === 429 && !responseHeaders.has("Retry-After")) responseHeaders.set("Retry-After", "60");
      if (route.startsWith("/api/mobile/")) {
        responseHeaders.set("Vary", "Authorization");
        responseHeaders.set("Referrer-Policy", "no-referrer");
        responseHeaders.set("Pragma", "no-cache");
      }
      logEvent("api.request", { status: response.status, duration_ms: Date.now() - started });
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
    });
  };
}
