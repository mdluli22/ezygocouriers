import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db/server";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api/response";

export async function GET() {
  try {
    // 1. Verify session
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse("Please log in to continue.");
    }

    // 2. Fetch fresh user data from DB
    const result = await query<{
      id: number;
      full_name: string;
      email: string;
      phone: string | null;
      role: string;
      avatar_url: string | null;
      auth_provider: string;
      is_active: boolean;
      created_at: string;
    }>(
      `SELECT id, full_name, email, phone, role, avatar_url, auth_provider, is_active, created_at
       FROM users WHERE id = $1 LIMIT 1`,
      [session.userId]
    );

    const user = result.rows[0];

    if (!user) {
      return unauthorizedResponse("User account not found.");
    }

    if (!user.is_active) {
      return unauthorizedResponse("Your account has been suspended.");
    }

    return successResponse("Authenticated.", user);
  } catch (error) {
    console.error("[GET /api/auth/me]", error);
    return serverErrorResponse("Something went wrong.");
  }
}
