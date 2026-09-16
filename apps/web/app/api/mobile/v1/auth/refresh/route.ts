import { NextRequest } from "next/server";
import { serverErrorResponse, successResponse } from "@/lib/api/response";
import {
  mobileTokenData,
  mobileUnauthorizedResponse,
  resolveMobileSession,
  secureMobileResponse,
} from "@/lib/auth/mobile-session";

export async function POST(request: NextRequest) {
  try {
    const session = await resolveMobileSession(request.headers, {
      refresh: true,
    });
    if (!session) return mobileUnauthorizedResponse();

    return secureMobileResponse(
      successResponse("Session renewed.", mobileTokenData(session))
    );
  } catch (error) {
    console.error("[POST /api/mobile/v1/auth/refresh]", error);
    return secureMobileResponse(
      serverErrorResponse("Unable to renew the mobile session.")
    );
  }
}
