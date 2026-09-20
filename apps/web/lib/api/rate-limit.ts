import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { query } from "@/lib/db/server";
import { ApiProblem } from "./errors";

export interface RatePolicy { name: string; max: number; seconds: number; accountMax?: number }

/** Classify both aliases and Better Auth endpoints into the same abuse buckets. */
export function ratePolicy(path: string, method: string): RatePolicy | null {
  if (method === "GET" && path === "/api/payments/paystack/callback")
    return { name: "payment-return", max: 60, seconds: 60 };
  if (method === "GET" && (path.startsWith("/api/auth/") || path.startsWith("/api/mobile/v1/auth/")))
    return { name: "auth-read", max: 240, seconds: 60 };
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return null;
  if (path.startsWith("/api/auth/") || path.startsWith("/api/mobile/v1/auth/")) {
    if (/send-verification|signup|sign-up|create-verification|request-password-reset|forget-password/.test(path))
      return { name: "otp-send", max: 10, accountMax: 5, seconds: 600 };
    if (/verify-email|check-verification|email-otp/.test(path))
      return { name: "otp-verify", max: 30, accountMax: 10, seconds: 600 };
    if (/login|sign-in/.test(path))
      return { name: "login", max: 30, accountMax: 10, seconds: 300 };
    return { name: "auth", max: 60, accountMax: 20, seconds: 60 };
  }
  if (path === "/api/driver/location")
    return { name: "location", max: 240, accountMax: 30, seconds: 60 };
  if (path === "/api/driver/status")
    return { name: "driver-status", max: 120, accountMax: 20, seconds: 60 };
  if (path === "/api/payments/create" || path === "/api/payments/sandbox-confirm" || (path === "/api/deliveries" && method === "POST"))
    return { name: "payment-create", max: 60, accountMax: 10, seconds: 60 };
  if (path === "/api/payments/callback" || path.endsWith("/webhook"))
    return { name: "payment-notification", max: 300, seconds: 60 };
  return null;
}

export function clientIdentity(headers: Headers): string {
  const header = process.env.API_TRUSTED_IP_HEADER;
  // Never trust a caller's arbitrary X-Forwarded-For. The configured ingress
  // must overwrite this single-IP header and deny direct origin access.
  const value = header ? headers.get(header)?.trim() : undefined;
  return value && isIP(value) ? value : "unidentified";
}

export async function consumeLimit(policy: RatePolicy, identity: string, max = policy.max) {
  const secret = process.env.API_RATE_LIMIT_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new ApiProblem("SERVICE_UNAVAILABLE", "Request protection is unavailable.", 503);
  const key = createHmac("sha256", secret).update(`${policy.name}:${identity}`).digest("hex");
  const result = await query<{ hits: number; retry_after: number }>(
    `INSERT INTO api_rate_limits (bucket_key, hits, expires_at)
     VALUES ($1, 1, NOW() + make_interval(secs => $2))
     ON CONFLICT (bucket_key) DO UPDATE SET
       hits = CASE WHEN api_rate_limits.expires_at <= NOW() THEN 1
                   ELSE LEAST(api_rate_limits.hits + 1, $3 + 1) END,
       expires_at = CASE WHEN api_rate_limits.expires_at <= NOW()
                        THEN NOW() + make_interval(secs => $2)
                        ELSE api_rate_limits.expires_at END
     RETURNING hits, GREATEST(1, CEIL(EXTRACT(EPOCH FROM expires_at - NOW())))::int AS retry_after`,
    [key, policy.seconds, max]
  );
  const row = result.rows[0];
  return { allowed: row.hits <= max, retryAfter: row.retry_after };
}
