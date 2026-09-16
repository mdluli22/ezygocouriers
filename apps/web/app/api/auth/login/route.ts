import { NextRequest } from "next/server";
import { loginSchema } from "@ezygo/contracts";
import { auth } from "@/lib/auth/auth";
import { applyAuthCookies } from "@/lib/auth/response";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api/response";
import { parseJsonRequest } from "@/lib/api/validation";
import { normalizeSignInError } from "@/lib/auth/sign-in-error";

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJsonRequest(req, loginSchema);
    if (!parsed.success) return parsed.response;
    const { email, password } = parsed.data;

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
    const signInError = normalizeSignInError(error);
    if (signInError) {
      return errorResponse(
        signInError.message,
        signInError.errors,
        signInError.status
      );
    }
    console.error("[POST /api/auth/login]", error);
    return serverErrorResponse("Something went wrong. Please try again.");
  }
}
