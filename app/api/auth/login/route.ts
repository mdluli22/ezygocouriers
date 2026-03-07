import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { query } from "@/lib/db/server";
import { comparePassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const formatted = Object.fromEntries(
        Object.entries(errors).map(([k, v]) => [k, v?.[0] ?? "Invalid"])
      );
      return errorResponse("Please fix the errors below.", formatted, 422);
    }

    const { email, password } = result.data;

    // 2. Find user by email
    const result2 = await query<{
      id: number;
      full_name: string;
      email: string;
      role: string;
      password_hash: string | null;
      is_active: boolean;
      auth_provider: string;
    }>(
      `SELECT id, full_name, email, role, password_hash, is_active, auth_provider
       FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    const user = result2.rows[0];

    // 3. Generic invalid credentials message (never reveal if email exists)
    if (!user || !user.password_hash) {
      return errorResponse("Invalid email or password.", undefined, 401);
    }

    // 4. Block Google-only accounts from password login
    if (user.auth_provider === "google" && !user.password_hash) {
      return errorResponse(
        "This account uses Google sign-in. Please continue with Google.",
        undefined,
        401
      );
    }

    // 5. Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return errorResponse("Invalid email or password.", undefined, 401);
    }

    // 6. Check account is active
    if (!user.is_active) {
      return errorResponse(
        "Your account has been suspended. Please contact support.",
        undefined,
        403
      );
    }

    // 7. Set session cookie
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role as "customer" | "driver" | "admin",
    });

    return successResponse("Welcome back!", {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return serverErrorResponse("Something went wrong. Please try again.");
  }
}
