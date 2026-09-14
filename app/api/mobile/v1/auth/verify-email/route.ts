import { NextRequest } from "next/server";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth/auth";
import { mobileVerifyEmailSchema } from "@ezygo/contracts";
import { parseJsonRequest } from "@/lib/api/validation";
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  mobileTokenData,
  readIssuedAuthToken,
  resolveMobileSession,
  secureMobileResponse,
} from "@/lib/auth/mobile-session";
import { query } from "@/lib/db/server";

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonRequest(request, mobileVerifyEmailSchema);
    if (!parsed.success) return secureMobileResponse(parsed.response);

    const verification = await auth.api.verifyEmailOTP({
      body: parsed.data,
      headers: request.headers,
      returnHeaders: true,
    });
    const accessToken = readIssuedAuthToken(verification.headers);

    if (!verification.response.token || !accessToken) {
      if (verification.response.token) {
        await query("DELETE FROM auth_sessions WHERE token = $1", [
          verification.response.token,
        ]);
      }
      return secureMobileResponse(
        serverErrorResponse("A mobile session could not be issued.")
      );
    }

    const session = await resolveMobileSession(request.headers, {
      accessToken,
      refresh: false,
    });
    if (!session) {
      await query("DELETE FROM auth_sessions WHERE token = $1", [
        verification.response.token,
      ]);
      return secureMobileResponse(
        serverErrorResponse("The new mobile session could not be verified.")
      );
    }

    return secureMobileResponse(
      successResponse("Email verified and signed in.", mobileTokenData(session))
    );
  } catch (error) {
    if (error instanceof APIError) {
      return secureMobileResponse(
        errorResponse(
          "The verification code is invalid or has expired.",
          { otp: "Request a new code and try again." },
          400
        )
      );
    }

    console.error("[POST /api/mobile/v1/auth/verify-email]", error);
    return secureMobileResponse(
      serverErrorResponse("Unable to verify the email address.")
    );
  }
}
