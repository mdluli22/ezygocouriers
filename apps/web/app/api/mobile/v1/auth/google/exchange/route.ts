import { NextRequest } from "next/server";
import { mobileGoogleExchangeSchema } from "@/lib/auth/mobile-oauth-route";
import { withMobileOAuthRoute } from "@/lib/auth/mobile-oauth-route";
import { parseJsonRequest } from "@/lib/api/validation";
import { successResponse } from "@/lib/api/response";
import { exchangeMobileGoogle } from "@/lib/auth/mobile-oauth";
async function handlePOST(request: NextRequest) {
  const parsed = await parseJsonRequest(request, mobileGoogleExchangeSchema);
  if (!parsed.success) return parsed.response;
  return successResponse("Signed in with Google.", await exchangeMobileGoogle(parsed.data, request.headers));
}
export const POST = withMobileOAuthRoute(handlePOST);
