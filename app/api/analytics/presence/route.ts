import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { recordPresence } from "@/lib/services/analytics";
import { successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  // Reject cross-site browser calls. Presence contains no client-supplied identity or timestamp.
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== request.nextUrl.origin)) return forbiddenResponse();
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    await recordPresence(session.sessionId, session.userId);
    return successResponse("Activity recorded.");
  } catch (error) {
    console.error("[Analytics presence]", error);
    return serverErrorResponse();
  }
}
