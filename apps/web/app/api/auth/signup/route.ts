import { NextRequest } from "next/server";
import { signupSchema } from "@ezygo/contracts";
import { applyAuthCookies } from "@/lib/auth/response";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api/response";
import { parseJsonRequest } from "@/lib/api/validation";
import {
  normalizeRegistrationError,
  registerEmailUser,
} from "@/lib/auth/email-registration";

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJsonRequest(req, signupSchema);
    if (!parsed.success) return parsed.response;
    const signUp = await registerEmailUser(parsed.data, req.headers);

    const response = successResponse(
      "Account created. Enter the verification code sent to your email.",
      {
        id: Number(signUp.response.user.id),
        full_name: signUp.response.user.name,
        email: signUp.response.user.email,
        role: signUp.response.user.role,
        requires_verification: true,
      },
      201
    );
    return applyAuthCookies(response, signUp.headers);
  } catch (error) {
    const registrationError = normalizeRegistrationError(error);
    if (registrationError) {
      return errorResponse(
        registrationError.message,
        registrationError.errors,
        registrationError.status
      );
    }
    console.error("[POST /api/auth/signup]", error);
    return serverErrorResponse("Something went wrong. Please try again.");
  }
}
