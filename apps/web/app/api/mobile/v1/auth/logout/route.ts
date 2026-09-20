import { logServerError } from "@/lib/api/context";
import { withApiRoute } from "@/lib/api/route";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { serverErrorResponse, successResponse } from "@/lib/api/response";
import {
  createBearerHeaders,
  mobileUnauthorizedResponse,
  readBearerToken,
  resolveMobileSession,
  secureMobileResponse,
} from "@/lib/auth/mobile-session";

async function handlePOST(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request.headers);
    if (!accessToken) return mobileUnauthorizedResponse();

    const session = await resolveMobileSession(request.headers, {
      accessToken,
      refresh: false,
    });
    if (!session) return mobileUnauthorizedResponse();

    await auth.api.signOut({
      headers: createBearerHeaders(request.headers, accessToken),
    });

    return secureMobileResponse(
      successResponse("Signed out successfully.")
    );
  } catch (error) {
    logServerError("[POST /api/mobile/v1/auth/logout]", error);
    return secureMobileResponse(serverErrorResponse("Unable to sign out."));
  }
}

export const POST = withApiRoute("/api/mobile/v1/auth/logout", handlePOST);
