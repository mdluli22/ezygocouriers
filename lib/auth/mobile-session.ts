import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { errorResponse } from "@/lib/api/response";
import type {
  MobileAuthTokenData,
  MobileAuthUser,
  UserRole,
} from "@ezygo/contracts";

export const MOBILE_AUTH_TOKEN_HEADER = "set-auth-token";
export const MOBILE_SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

const USER_ROLES = new Set<UserRole>(["customer", "driver", "admin"]);

export interface ResolvedMobileSession {
  accessToken: string;
  expiresAt: string;
  user: MobileAuthUser;
}

export function readBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization || authorization.length > 4096) return null;

  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  return match?.[1] ?? null;
}

export function readIssuedAuthToken(headers: Headers): string | null {
  const token = headers.get(MOBILE_AUTH_TOKEN_HEADER)?.trim();
  return token && token.length <= 4096 ? token : null;
}

export function createBearerHeaders(
  requestHeaders: Headers,
  accessToken: string
): Headers {
  const headers = new Headers(requestHeaders);
  headers.set("authorization", `Bearer ${accessToken}`);
  return headers;
}

export async function resolveMobileSession(
  requestHeaders: Headers,
  options: { accessToken?: string; refresh?: boolean } = {}
): Promise<ResolvedMobileSession | null> {
  const suppliedToken = options.accessToken ?? readBearerToken(requestHeaders);
  if (!suppliedToken) return null;

  const result = await auth.api.getSession({
    headers: createBearerHeaders(requestHeaders, suppliedToken),
    query: {
      disableCookieCache: true,
      disableRefresh: options.refresh === false,
    },
    returnHeaders: true,
  });

  const session = result.response;
  if (
    !session?.user ||
    session.user.isActive !== true ||
    session.user.emailVerified !== true ||
    !USER_ROLES.has(session.user.role)
  ) {
    return null;
  }

  const userId = Number(session.user.id);
  const expiresAt = new Date(session.session.expiresAt);
  if (!Number.isInteger(userId) || Number.isNaN(expiresAt.getTime())) return null;

  return {
    accessToken: readIssuedAuthToken(result.headers) ?? suppliedToken,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: userId,
      full_name: session.user.name,
      email: session.user.email,
      phone: session.user.phone ?? null,
      role: session.user.role,
      avatar_url: session.user.image ?? null,
    },
  };
}

export function mobileTokenData(
  session: ResolvedMobileSession
): MobileAuthTokenData {
  return {
    access_token: session.accessToken,
    token_type: "Bearer" as const,
    expires_at: session.expiresAt,
    expires_in: Math.max(
      0,
      Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 1000)
    ),
    user: session.user,
  };
}

export function secureMobileResponse(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Authorization");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export function mobileUnauthorizedResponse(
  message = "A valid bearer session is required."
): NextResponse {
  const response = errorResponse(message, undefined, 401, "UNAUTHORIZED");
  response.headers.set("WWW-Authenticate", 'Bearer realm="EzyGo mobile"');
  return secureMobileResponse(response);
}
