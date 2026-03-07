import { clearSessionCookie } from "@/lib/auth/session";
import { successResponse, serverErrorResponse } from "@/lib/api/response";

export async function POST() {
  try {
    await clearSessionCookie();
    return successResponse("You have been logged out successfully.");
  } catch (error) {
    console.error("[POST /api/auth/logout]", error);
    return serverErrorResponse("Something went wrong during logout.");
  }
}
