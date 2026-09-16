import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { loginSchema } from "@ezygo/contracts";
import { parseJsonRequest } from "@/lib/api/validation";
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { normalizeSignInError } from "@/lib/auth/sign-in-error";
import {
  mobileTokenData,
  readIssuedAuthToken,
  resolveMobileSession,
  secureMobileResponse,
} from "@/lib/auth/mobile-session";
import { query } from "@/lib/db/server";

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonRequest(request, loginSchema);
    if (!parsed.success) return secureMobileResponse(parsed.response);

    const signIn = await auth.api.signInEmail({
      body: { ...parsed.data, rememberMe: true },
      headers: request.headers,
      returnHeaders: true,
    });
    const accessToken = readIssuedAuthToken(signIn.headers);

    if (!accessToken) {
      await query("DELETE FROM auth_sessions WHERE token = $1", [
        signIn.response.token,
      ]);
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
        signIn.response.token,
      ]);
      return secureMobileResponse(
        serverErrorResponse("The new mobile session could not be verified.")
      );
    }

    return secureMobileResponse(
      successResponse("Signed in successfully.", mobileTokenData(session))
    );
  } catch (error) {
    const signInError = normalizeSignInError(error);
    if (signInError) {
      return secureMobileResponse(
        errorResponse(
          signInError.message,
          signInError.errors,
          signInError.status
        )
      );
    }

    console.error("[POST /api/mobile/v1/auth/login]", error);
    return secureMobileResponse(serverErrorResponse("Unable to sign in."));
  }
}
