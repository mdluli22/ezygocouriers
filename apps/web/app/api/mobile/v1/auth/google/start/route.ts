import { NextRequest } from "next/server";
import { mobileGoogleRequestSchema } from "@ezygo/contracts";
import { withApiRoute } from "@/lib/api/route";
import { errorResponse } from "@/lib/api/response";
import { startMobileGoogle } from "@/lib/auth/mobile-oauth";
async function handleGET(request: NextRequest) {
  const id = mobileGoogleRequestSchema.safeParse(request.nextUrl.searchParams.get("request"));
  if (!id.success) return errorResponse("Invalid sign-in request.", undefined, 400, "OAUTH_INVALID");
  return startMobileGoogle(request, id.data);
}
export const GET = withApiRoute("/api/mobile/v1/auth/google/start", handleGET);
