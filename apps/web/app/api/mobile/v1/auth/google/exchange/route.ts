import { NextRequest } from "next/server";
import { mobileGoogleExchangeSchema } from "@ezygo/contracts";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonRequest } from "@/lib/api/validation";
import { successResponse } from "@/lib/api/response";
import { exchangeMobileGoogle } from "@/lib/auth/mobile-oauth";
async function handlePOST(request: NextRequest) {
  const parsed = await parseJsonRequest(request, mobileGoogleExchangeSchema);
  if (!parsed.success) return parsed.response;
  return successResponse("Signed in with Google.", await exchangeMobileGoogle(parsed.data, request.headers));
}
export const POST = withApiRoute("/api/mobile/v1/auth/google/exchange", handlePOST);
