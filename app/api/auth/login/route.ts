import { NextRequest } from "next/server";
import { APIError } from "better-auth/api";
import { loginSchema } from "@/lib/validations/auth";
import { auth } from "@/lib/auth/auth";
import { applyAuthCookies } from "@/lib/auth/response";
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

    const signIn = await auth.api.signInEmail({
      body: { email, password },
      headers: req.headers,
      returnHeaders: true,
    });

    const response = successResponse("Welcome back!", {
      id: Number(signIn.response.user.id),
      full_name: signIn.response.user.name,
      email: signIn.response.user.email,
      role: signIn.response.user.role,
    });

    return applyAuthCookies(response, signIn.headers);
  } catch (error) {
    if (error instanceof APIError) {
      const errorCode =
        typeof error.body === "object" && error.body && "code" in error.body
          ? String(error.body.code)
          : "";
      if (errorCode === "EMAIL_NOT_VERIFIED") {
        return errorResponse(
          "Please verify your email address before signing in.",
          { email: "Email verification is required" },
          403
        );
      }

      const status = error.statusCode === 403 ? 403 : 401;
      const message = status === 403
        ? "Your account cannot sign in. Please contact support."
        : "Invalid email or password.";
      return errorResponse(message, undefined, status);
    }
    console.error("[POST /api/auth/login]", error);
    return serverErrorResponse("Something went wrong. Please try again.");
  }
}
