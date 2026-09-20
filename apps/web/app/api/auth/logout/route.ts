import { logServerError } from "@/lib/api/context";
import { withApiRoute } from "@/lib/api/route";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { applyAuthCookies } from "@/lib/auth/response";
import { successResponse, serverErrorResponse } from "@/lib/api/response";

async function handlePOST() {
  try {
    const signOut = await auth.api.signOut({
      headers: await headers(),
      returnHeaders: true,
    });
    const response = successResponse("You have been logged out successfully.");
    return applyAuthCookies(response, signOut.headers);
  } catch (error) {
    logServerError("[POST /api/auth/logout]", error);
    return serverErrorResponse("Something went wrong during logout.");
  }
}

export const POST = withApiRoute("/api/auth/logout", handlePOST);
