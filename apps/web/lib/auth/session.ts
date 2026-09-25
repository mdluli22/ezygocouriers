import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { UserRole } from "@ezygo/contracts";

export type { UserRole } from "@ezygo/contracts";

export interface AppSession {
  sessionId: string;
  userId: number;
  email: string;
  role: UserRole;
}

/**
 * Resolve the authoritative Better Auth session from the database.
 * The compact AppSession shape keeps the rest of the business logic stable.
 */
export async function getSession(): Promise<AppSession | null> {
  const requestHeaders = await headers();
  if (requestHeaders.has("authorization")) {
    const { resolveMobileSession } = await import("./mobile-session");
    const mobile = await resolveMobileSession(requestHeaders);
    return mobile ? { sessionId: mobile.sessionId, userId: mobile.user.id, email: mobile.user.email, role: mobile.user.role } : null;
  }
  const session = await auth.api.getSession({
    headers: requestHeaders,
    query: { disableCookieCache: true },
  });

  if (
    !session?.user ||
    session.user.isActive !== true ||
    session.user.emailVerified !== true
  ) {
    return null;
  }

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) return null;

  return {
    sessionId: session.session.id,
    userId,
    email: session.user.email,
    role: session.user.role,
  };
}
