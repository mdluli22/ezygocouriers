import { NextRequest } from "next/server";
import { mobileGoogleStartSchema } from "@ezygo/contracts";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonRequest } from "@/lib/api/validation";
import { successResponse } from "@/lib/api/response";
import { beginMobileGoogle } from "@/lib/auth/mobile-oauth";
async function handlePOST(request: NextRequest) {
  const parsed = await parseJsonRequest(request, mobileGoogleStartSchema);
  if (!parsed.success) return parsed.response;
  return successResponse("Google sign-in started.", await beginMobileGoogle(parsed.data));
}
export const POST = withApiRoute("/api/mobile/v1/auth/google", handlePOST);
