import { NextRequest } from "next/server";
import { serverErrorResponse, successResponse } from "@/lib/api/response";
import {
  mobileUnauthorizedResponse,
  resolveMobileSession,
  secureMobileResponse,
} from "@/lib/auth/mobile-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await resolveMobileSession(request.headers);
    if (!session) return mobileUnauthorizedResponse();

    return secureMobileResponse(
      successResponse("Session is active.", {
        expires_at: session.expiresAt,
        user: session.user,
      })
    );
  } catch (error) {
    console.error("[GET /api/mobile/v1/auth/session]", error);
    return secureMobileResponse(
      serverErrorResponse("Unable to validate the mobile session.")
    );
  }
}
