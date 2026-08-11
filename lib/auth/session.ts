import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export type UserRole = "customer" | "driver" | "admin";

export interface AppSession {
  userId: number;
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
    userId,
    email: session.user.email,
    role: session.user.role,
  };
}
