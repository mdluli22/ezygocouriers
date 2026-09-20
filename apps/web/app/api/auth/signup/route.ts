import { logServerError } from "@/lib/api/context";
import { withApiRoute } from "@/lib/api/route";
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

async function handlePOST(req: NextRequest) {
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
    logServerError("[POST /api/auth/signup]", error);
    return serverErrorResponse("Something went wrong. Please try again.");
  }
}

export const POST = withApiRoute("/api/auth/signup", handlePOST);
