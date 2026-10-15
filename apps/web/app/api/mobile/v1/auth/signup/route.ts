import { NextRequest } from "next/server";
import { signupSchema } from "@ezygo/contracts";
import { parseJsonRequest } from "@/lib/api/validation";
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  normalizeRegistrationError,
  registerEmailUser,
} from "@/lib/auth/email-registration";
import { secureMobileResponse } from "@/lib/auth/mobile-session";

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonRequest(request, signupSchema);
    if (!parsed.success) return secureMobileResponse(parsed.response);

    const signUp = await registerEmailUser(parsed.data, request.headers);
    return secureMobileResponse(
      successResponse(
        "Account created. Enter the verification code sent to your email.",
        {
          id: Number(signUp.response.user.id),
          full_name: signUp.response.user.name,
          email: signUp.response.user.email,
          role: signUp.response.user.role,
          requires_verification: true,
        },
        201
      )
    );
  } catch (error) {
    const registrationError = normalizeRegistrationError(error);
    if (registrationError) {
      return secureMobileResponse(
        errorResponse(
          registrationError.message,
          registrationError.errors,
          registrationError.status
        )
      );
    }

    console.error("[POST /api/mobile/v1/auth/signup]", error);
    return secureMobileResponse(serverErrorResponse("Unable to create account."));
  }
}
