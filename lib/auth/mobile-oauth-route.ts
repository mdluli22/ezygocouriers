import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api/response";
import { secureMobileResponse } from "./mobile-session";
import { consumeRateLimit, RateLimitError } from "@/lib/security/rate-limit";

const state = z.string().regex(/^[a-f0-9]{64}$/);
const opaque = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const mobileGoogleStartSchema = z.object({ state, code_challenge: opaque });
export const mobileGoogleExchangeSchema = z.object({ state, code: opaque, code_verifier: state });
export const mobileGoogleRequestSchema = opaque;

export class MobileOAuthError extends Error {
  constructor(readonly code: "BAD_REQUEST" | "SERVICE_UNAVAILABLE", message: string, readonly status = 400) { super(message); }
}

export function withMobileOAuthRoute(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    try {
      // POST requests also pass through the existing shared auth guard in proxy.ts.
      const ip = process.env.TRUST_PROXY_IP === "true" ? request.headers.get("x-real-ip") || "unknown" : "unknown";
      await consumeRateLimit(`mobile-google:${request.nextUrl.pathname}:${ip}`, 60, 60);
      return secureMobileResponse(await handler(request));
    } catch (error) {
      if (error instanceof MobileOAuthError) return secureMobileResponse(errorResponse(error.message, undefined, error.status, error.code));
      if (error instanceof RateLimitError) {
        const response = secureMobileResponse(errorResponse(error.message, undefined, 429, "RATE_LIMITED"));
        response.headers.set("Retry-After", String(error.retryAfter));
        return response;
      }
      // Do not log cookies, authorization codes, provider errors or session tokens.
      console.error("Mobile Google sign-in failed.");
      return secureMobileResponse(errorResponse("Google sign-in is temporarily unavailable. Please try again.", undefined, 503));
    }
  };
}
