import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { applyAuthCookies } from "@/lib/auth/response";
import { successResponse, serverErrorResponse } from "@/lib/api/response";

export async function POST() {
  try {
    const signOut = await auth.api.signOut({
      headers: await headers(),
      returnHeaders: true,
    });
    const response = successResponse("You have been logged out successfully.");
    return applyAuthCookies(response, signOut.headers);
  } catch (error) {
    console.error("[POST /api/auth/logout]", error);
    return serverErrorResponse("Something went wrong during logout.");
  }
}
