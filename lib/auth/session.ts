import { productionAccountAllowed } from "@/lib/security/seed-account-protection";
import { driverIsActive } from "@/lib/security/driver-access";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { UserRole } from "@ezygo/contracts";

export type { UserRole } from "@ezygo/contracts";

export interface AppSession {
  userId: number;
  sessionId: string;
  email: string;
  role: UserRole;
}

/**
 * Resolve the authoritative Better Auth session from the database.
 * The compact AppSession shape keeps the rest of the business logic stable.
 */
export async function getSession(): Promise<AppSession | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
    // Reads during rendering cannot send Set-Cookie. The proxy owns renewal.
    query: { disableCookieCache: true, disableRefresh: true },
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

  if (!await productionAccountAllowed(userId)) return null;
  if (session.user.role === "driver" && !await driverIsActive(userId)) return null;

  return {
    userId,
    sessionId: session.session.id,
    email: session.user.email,
    role: session.user.role,
  };
}
