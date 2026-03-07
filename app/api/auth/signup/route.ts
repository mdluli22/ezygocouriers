import { NextRequest } from "next/server";
import { signupSchema } from "@/lib/validations/auth";
import { query } from "@/lib/db/server";
import { hashPassword } from "@/lib/auth/password";
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
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const formatted = Object.fromEntries(
        Object.entries(errors).map(([k, v]) => [k, v?.[0] ?? "Invalid"])
      );
      return errorResponse("Please fix the errors below.", formatted, 422);
    }

    const { full_name, email, phone, password } = result.data;

    // 2. Check if email already exists
    const existing = await query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      return errorResponse(
        "An account with this email already exists.",
        { email: "Email is already registered" },
        409
      );
    }

    // 3. Hash the password
    const password_hash = await hashPassword(password);

    // 4. Insert the new user
    const insertResult = await query<{
      id: number;
      full_name: string;
      email: string;
      role: string;
    }>(
      `INSERT INTO users (full_name, email, phone, password_hash, auth_provider, role)
       VALUES ($1, $2, $3, $4, 'email', 'customer')
       RETURNING id, full_name, email, role`,
      [full_name, email, phone || null, password_hash]
    );

    const user = insertResult.rows[0];

    // 5. Set session cookie
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role as "customer" | "driver" | "admin",
    });

    return successResponse(
      "Account created successfully. Welcome to EzyGo!",
      { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
      201
    );
  } catch (error) {
    console.error("[POST /api/auth/signup]", error);
    return serverErrorResponse("Something went wrong. Please try again.");
  }
}
