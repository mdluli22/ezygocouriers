import { createHash } from "node:crypto";
import { query } from "@/lib/db/server";

export class RateLimitError extends Error {
  constructor(readonly retryAfter: number) { super("Too many attempts. Please try again later."); }
}

/** PostgreSQL-backed limits apply across processes and survive restarts. */
export async function consumeRateLimit(key: string, limit: number, seconds: number): Promise<void> {
  const result = await query<{ hits: number; retry_after: number }>(
    `INSERT INTO request_rate_limits(key_hash, expires_at) VALUES ($1, NOW()+$2*INTERVAL '1 second')
     ON CONFLICT(key_hash) DO UPDATE SET
       hits=CASE WHEN request_rate_limits.expires_at<=NOW() THEN 1 ELSE request_rate_limits.hits+1 END,
       window_start=CASE WHEN request_rate_limits.expires_at<=NOW() THEN NOW() ELSE request_rate_limits.window_start END,
       expires_at=CASE WHEN request_rate_limits.expires_at<=NOW() THEN NOW()+$2*INTERVAL '1 second' ELSE request_rate_limits.expires_at END
     RETURNING hits, GREATEST(1, CEIL(EXTRACT(EPOCH FROM expires_at-NOW())))::integer AS retry_after`,
    [createHash("sha256").update(key).digest("hex"), seconds]
  );
  if (result.rows[0].hits > limit) throw new RateLimitError(result.rows[0].retry_after);
}
