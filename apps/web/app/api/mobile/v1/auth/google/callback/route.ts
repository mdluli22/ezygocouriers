import { NextRequest } from "next/server";
import { mobileGoogleRequestSchema } from "@/lib/auth/mobile-oauth-route";
import { withMobileOAuthRoute } from "@/lib/auth/mobile-oauth-route";
import { errorResponse } from "@/lib/api/response";
import { finishMobileGoogle } from "@/lib/auth/mobile-oauth";
async function handleGET(request: NextRequest) {
  const id = mobileGoogleRequestSchema.safeParse(request.nextUrl.searchParams.get("request"));
  if (!id.success) return errorResponse("Invalid sign-in request.", undefined, 400, "BAD_REQUEST");
  return finishMobileGoogle(request, id.data);
}
export const GET = withMobileOAuthRoute(handleGET);
